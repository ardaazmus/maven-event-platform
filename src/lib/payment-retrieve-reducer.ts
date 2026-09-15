import type { PaymentOrderSnapshot } from '@/lib/payment-state'
import type { NormalizedProviderRetrieveResult } from '@/lib/payment-retrieve-contract'
import { decideRetrievedPaymentTransition } from '@/lib/payment-retrieve-reconciliation'
import type { PaymentRetrieveJob } from '@/lib/payment-retrieve-job'
import { handoffVerifiedPaymentRefundToInvoice, persistInvoiceRefundReviewInTransaction } from '@/lib/payment-invoice-refund-handoff'

type RetrieveReducerTransaction = {
  paymentOrder: {
    findUnique(args: {
      where: { id: string }
      select: {
        id: true
        provider: true
        providerOrderId: true
        amountMinor: true
        currency: true
        status: true
        workspaceId: true
      }
    }): Promise<(PaymentOrderSnapshot & { id: string; workspaceId: string }) | null>
    update(args: { where: { id: string }; data: { status: PaymentOrderSnapshot['status'] } }): Promise<unknown>
  }
  paymentAttempt: {
    updateMany(args: {
      where: {
        id: string
        paymentOrderId: string
        provider: string
        providerPaymentId: string
        status: 'processing'
        retrieveLockedBy: string
        retrieveLockedUntil: { gt: Date }
      }
      data: {
        status: PaymentOrderSnapshot['status']
        retrieveLockedBy: null
        retrieveLockedUntil: null
      }
    }): Promise<{ count: number }>
  }
  invoiceRecord: {
    findFirst(args: {
      where: { paymentOrderId: string; workspaceId: string }
      select: { id: true; workspaceId: true; paymentOrderId: true; state: true }
    }): Promise<{ id: string; workspaceId: string; paymentOrderId: string; state: string } | null>
    updateMany(args: {
      where: { id: string; workspaceId: string; state: string }
      data: { state: 'refund_or_credit_note_review' }
    }): Promise<{ count: number }>
  }
  auditLog: {
    create(args: { data: { workspaceId: string; action: string; resourceType: string; resourceId: string; beforeJson: string; afterJson: string } }): Promise<unknown>
  }
}

type ApplyRetrievedDecisionInput = {
  job: PaymentRetrieveJob
  retrieved: NormalizedProviderRetrieveResult | { ok: false; category: 'configuration'; code: 'provider_invalid' }
  nowMs: number
}

type ApplyRetrievedDecisionResult =
  | { ok: true; changed: boolean; status: PaymentOrderSnapshot['status'] }
  | { ok: false; reason: string; category?: string; code?: string }

/** Applies only a valid retrieve decision and releases the worker lease atomically. */
export async function applyRetrievedPaymentDecision(
  tx: RetrieveReducerTransaction,
  input: ApplyRetrievedDecisionInput,
): Promise<ApplyRetrievedDecisionResult> {
  const order = await tx.paymentOrder.findUnique({
    where: { id: input.job.paymentOrderId },
    select: {
      id: true,
      provider: true,
      providerOrderId: true,
      amountMinor: true,
      currency: true,
      status: true,
      workspaceId: true,
    },
  })
  if (!order) return { ok: false, reason: 'order_not_found' }

  const decision = decideRetrievedPaymentTransition(order, input.retrieved)
  if (!decision.ok) {
    if ('category' in decision && 'code' in decision) {
      return { ok: false, reason: decision.reason, category: decision.category, code: decision.code }
    }
    return { ok: false, reason: decision.reason }
  }

  const attemptUpdate = await tx.paymentAttempt.updateMany({
    where: {
      id: input.job.attemptId,
      paymentOrderId: input.job.paymentOrderId,
      provider: input.job.provider,
      providerPaymentId: input.job.providerPaymentId,
      status: 'processing',
      retrieveLockedBy: input.job.lockedBy,
      retrieveLockedUntil: { gt: new Date(input.nowMs) },
    },
    data: {
      status: decision.status,
      retrieveLockedBy: null,
      retrieveLockedUntil: null,
    },
  })
  if (attemptUpdate.count !== 1) return { ok: false, reason: 'claim_lost' }
  if (decision.changed) await tx.paymentOrder.update({ where: { id: order.id }, data: { status: decision.status } })
  if (['refunded', 'partially_refunded', 'disputed'].includes(decision.status)) {
    const invoice = await tx.invoiceRecord.findFirst({
      where: { paymentOrderId: order.id, workspaceId: order.workspaceId },
      select: { id: true, workspaceId: true, paymentOrderId: true, state: true },
    })
    const handoff = await handoffVerifiedPaymentRefundToInvoice({
      verified: true,
      workspaceId: order.workspaceId,
      paymentOrderId: order.id,
      paymentStatus: decision.status,
      eventKind: decision.status === 'disputed' ? 'chargeback' : 'refund',
      invoice,
    }, refund => persistInvoiceRefundReviewInTransaction(refund, invoice!, tx))
    if (handoff.status === 'blocked') throw new Error(`invoice_refund_${handoff.reason}`)
  }
  return { ok: true, changed: decision.changed, status: decision.status }
}
