import { db } from '@/lib/db'
import { evaluatePaymentTransition, type PaymentEventStatus, type PaymentOrderStatus, type VerifiedPaymentEvent } from '@/lib/payment-state'
import { handoffSucceededPaymentToInvoice } from '@/lib/payment-invoice-webhook-handoff'
import { handoffVerifiedPaymentRefundToInvoice, persistInvoiceRefundReviewInTransaction } from '@/lib/payment-invoice-refund-handoff'
import { IYZICO_VERIFIED_PAYMENT_EVENT_TYPES, isIyzicoUnverifiedRiskStatus } from '@/lib/payment-provider-contract'

const stripeEventStatuses: Record<string, PaymentEventStatus> = {
  'payment_intent.requires_action': 'requires_action',
  'payment_intent.processing': 'processing',
  'payment_intent.succeeded': 'succeeded',
  'payment_intent.payment_failed': 'failed',
  'payment_intent.canceled': 'canceled',
  'charge.refunded': 'refunded',
  'charge.dispute.created': 'disputed',
}

// Refund/cancel/chargeback events and statuses stay blocked until their provider contract is verified.

const iyzicoPaymentStatuses: Record<string, PaymentEventStatus> = {
  SUCCESS: 'succeeded',
  FAILURE: 'failed',
}

export interface StoredPaymentWebhookMetadata {
  provider: string
  eventType: string
  providerStatus: string | null
  providerPaymentId: string | null
  signatureVerified: boolean
  amountMinor: number | null
  currency: string | null
}

export type PaymentWebhookProcessingResult =
  | { status: 'processed'; paymentOrderId: string; paymentStatus: PaymentOrderStatus; changed: boolean }
  | { status: 'ignored'; reason: 'unsupported_provider_event' | 'missing_payment_metadata' | 'payment_order_not_found' | 'signature_not_verified' | 'provider_mismatch' | 'payment_id_mismatch' | 'amount_mismatch' | 'currency_mismatch' | 'invalid_transition' }
  | { status: 'not_found' | 'already_processed'; processingStatus?: string }

export function normalizePaymentWebhookMetadata(input: StoredPaymentWebhookMetadata): VerifiedPaymentEvent | null {
  if (!input.providerPaymentId || !input.signatureVerified) return null
  if (input.provider === 'stripe') {
    const targetStatus = input.eventType === 'charge.refunded'
      ? input.providerStatus === 'PARTIALLY_REFUNDED' ? 'partially_refunded' : input.providerStatus === 'REFUNDED' ? 'refunded' : undefined
      : stripeEventStatuses[input.eventType]
    if (!targetStatus || input.amountMinor === null || !input.currency) return null
    return {
      provider: input.provider,
      providerPaymentId: input.providerPaymentId,
      signatureVerified: input.signatureVerified,
      targetStatus,
      amountMinor: input.amountMinor,
      currency: input.currency,
    }
  }
  if (input.provider !== 'iyzico' || !(IYZICO_VERIFIED_PAYMENT_EVENT_TYPES as readonly string[]).includes(input.eventType) || !input.providerStatus) return null
  const providerStatus = input.providerStatus.toUpperCase()
  if (isIyzicoUnverifiedRiskStatus(providerStatus)) return null
  const targetStatus = iyzicoPaymentStatuses[providerStatus]
  if (!targetStatus) return null
  return {
    provider: input.provider,
    providerPaymentId: input.providerPaymentId,
    signatureVerified: input.signatureVerified,
    targetStatus,
  }
}

export async function claimPaymentWebhookEvents(limit = 10, workerId = 'payment-worker'): Promise<string[]> {
  const now = new Date()
  const events = await db.paymentWebhookEvent.findMany({
    where: {
      OR: [
        { processingStatus: 'received' },
        { processingStatus: 'processing', lockedUntil: { lt: now } },
      ],
    },
    orderBy: { receivedAt: 'asc' },
    take: limit,
    select: { id: true },
  })
  const claimed: string[] = []
  for (const event of events) {
    const result = await db.paymentWebhookEvent.updateMany({
      where: {
        id: event.id,
        OR: [
          { processingStatus: 'received' },
          { processingStatus: 'processing', lockedUntil: { lt: now } },
        ],
      },
      data: {
        processingStatus: 'processing',
        attemptCount: { increment: 1 },
        lockedBy: workerId,
        lockedUntil: new Date(Date.now() + 30_000),
      },
    })
    if (result.count === 1) claimed.push(event.id)
  }
  return claimed
}

export async function runPaymentWebhookWorkerOnce(limit = 10, workerId = `payment-worker-${Date.now()}`) {
  const eventIds = await claimPaymentWebhookEvents(limit, workerId)
  const results: PaymentWebhookProcessingResult[] = []
  for (const eventId of eventIds) results.push(await processPaymentWebhookEvent(eventId, workerId))
  return { claimed: eventIds.length, results }
}

/** Processes one verified inbox event; callers should invoke this from a durable worker. */
export async function processPaymentWebhookEvent(eventId: string, workerId = 'payment-worker'): Promise<PaymentWebhookProcessingResult> {
  return db.$transaction(async tx => {
    const event = await tx.paymentWebhookEvent.findUnique({ where: { id: eventId } })
    if (!event) return { status: 'not_found' }
    if (event.processingStatus === 'processing' && event.lockedBy !== workerId) return { status: 'already_processed', processingStatus: event.processingStatus }
    if (event.processingStatus !== 'received' && event.processingStatus !== 'processing') return { status: 'already_processed', processingStatus: event.processingStatus }

    if (event.processingStatus === 'received') {
      const claim = await tx.paymentWebhookEvent.updateMany({
        where: { id: event.id, processingStatus: 'received' },
        data: { processingStatus: 'processing', attemptCount: { increment: 1 }, lockedBy: workerId, lockedUntil: new Date(Date.now() + 30_000) },
      })
      if (claim.count !== 1) return { status: 'already_processed', processingStatus: 'processing' }
    }

    const clearLease = { lockedBy: null, lockedUntil: null }

    const normalized = normalizePaymentWebhookMetadata({
      provider: event.provider,
      eventType: event.eventType,
      providerPaymentId: event.providerPaymentId,
      providerStatus: event.providerStatus,
      signatureVerified: event.signatureVerified,
      amountMinor: event.amountMinor,
      currency: event.currency,
    })
    if (!normalized) {
      const reason = event.provider !== 'stripe' || !stripeEventStatuses[event.eventType]
        ? 'unsupported_provider_event'
        : 'missing_payment_metadata'
      await tx.paymentWebhookEvent.update({ where: { id: event.id }, data: { ...clearLease, processingStatus: 'ignored', failureCode: reason, processedAt: new Date() } })
      return { status: 'ignored', reason }
    }

    if (!normalized.signatureVerified) {
      await tx.paymentWebhookEvent.update({ where: { id: event.id }, data: { ...clearLease, processingStatus: 'ignored', failureCode: 'signature_not_verified', processedAt: new Date() } })
      return { status: 'ignored', reason: 'signature_not_verified' }
    }

    const order = await tx.paymentOrder.findFirst({
      where: { workspaceId: event.workspaceId, provider: event.provider, providerOrderId: event.providerPaymentId },
      select: { id: true, provider: true, providerOrderId: true, amountMinor: true, currency: true, status: true, workspaceId: true, formId: true, submissionId: true, publishedVersionId: true },
    })
    if (!order) {
      await tx.paymentWebhookEvent.update({ where: { id: event.id }, data: { ...clearLease, processingStatus: 'ignored', failureCode: 'payment_order_not_found', processedAt: new Date() } })
      return { status: 'ignored', reason: 'payment_order_not_found' }
    }

    const transition = evaluatePaymentTransition({ ...order, status: order.status as PaymentOrderStatus }, normalized)
    if (!transition.accepted) {
      await tx.paymentWebhookEvent.update({ where: { id: event.id }, data: { ...clearLease, paymentOrderId: order.id, processingStatus: 'ignored', failureCode: transition.reason, processedAt: new Date() } })
      return { status: 'ignored', reason: transition.reason }
    }

    if (transition.changed) {
      await tx.paymentOrder.update({ where: { id: order.id }, data: { status: transition.status } })
      if (['requires_action', 'processing', 'succeeded', 'failed', 'canceled'].includes(transition.status)) {
        await tx.paymentAttempt.create({ data: { paymentOrderId: order.id, provider: event.provider, providerPaymentId: event.providerPaymentId, status: transition.status } })
      }
      if (transition.status === 'succeeded' && order.submissionId && order.publishedVersionId) {
        const invoiceHandoff = await handoffSucceededPaymentToInvoice(tx, { ...order, status: transition.status })
        if (!invoiceHandoff.ok) throw new Error(`invoice_snapshot_${invoiceHandoff.reason}`)
      }
      if (['refunded', 'partially_refunded', 'disputed'].includes(transition.status)) {
        const invoice = await tx.invoiceRecord.findFirst({
          where: { paymentOrderId: order.id, workspaceId: order.workspaceId },
          select: { id: true, workspaceId: true, paymentOrderId: true, state: true },
        })
        const handoff = await handoffVerifiedPaymentRefundToInvoice({
          verified: true,
          workspaceId: order.workspaceId,
          paymentOrderId: order.id,
          paymentStatus: transition.status,
          eventKind: transition.status === 'disputed' ? 'chargeback' : 'refund',
          invoice,
        }, refund => persistInvoiceRefundReviewInTransaction(refund, invoice!, tx))
        if (handoff.status === 'blocked') throw new Error(`invoice_refund_${handoff.reason}`)
      }
    }
    await tx.paymentWebhookEvent.update({ where: { id: event.id }, data: { ...clearLease, paymentOrderId: order.id, processingStatus: 'processed', processedAt: new Date(), failureCode: null } })
    return { status: 'processed', paymentOrderId: order.id, paymentStatus: transition.status, changed: transition.changed }
  })
}
