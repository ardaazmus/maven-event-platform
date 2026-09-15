import type { Prisma } from '@prisma/client'
import { buildInvoiceReadyEmail } from '@/lib/invoice-email'
import { emailQueuePriority } from '@/lib/email-queue'
import { hashRecipientEmail } from '@/lib/email-recipient-hash'
import { db } from '@/lib/db'

const deliveryChannel = 'email' as const
const deliveryQueueClass = 'transactional' as const
const resendConfirmation = 'RESEND'
const resendableInvoiceStates = new Set(['delivery_queued', 'sent', 'delivery_failed', 'delivery_suppressed'])

export type InvoiceResendInput = {
  workspaceId: string
  formId: string
  submissionId: string
  invoiceRecordId: string
  documentId: string
  invoiceState: string
  documentState: string
  documentReadyState: string
  scanStatus: string
  recipientEmail: string
  formTitle: string
  invoiceNumber?: string | null
  documentUrl: string
  appOrigin: string
  authorizedById: string
  resendKey: string
  confirmation?: string
  hasPriorDelivery: boolean
  suppressed: boolean
}

export type InvoiceResendCommand = {
  status: 'ready'
  idempotencyKey: string
  channel: typeof deliveryChannel
  queueClass: typeof deliveryQueueClass
  outbox: {
    workspaceId: string
    formId: string
    submissionId: string
    type: 'email'
    queueClass: typeof deliveryQueueClass
    priority: number
    payload: {
      recipientEmail: string
      subject: string
      textBody: string
      html: string
      documentUrl: string
    }
  }
}

export type InvoiceResendDecision = InvoiceResendCommand | { status: 'duplicate_warning'; reason: 'prior_delivery_exists' | 'confirmation_required' } | { status: 'suppressed'; reason: 'recipient_suppressed' }

export type InvoiceResendResult =
  | { status: 'queued'; deliveryIntentId: string; outboxEventId: string; idempotencyKey: string }
  | { status: 'duplicate'; deliveryIntentId: string; idempotencyKey: string }
  | { status: 'duplicate_warning'; reason: 'prior_delivery_exists' | 'confirmation_required' }
  | { status: 'suppressed'; reason: 'recipient_suppressed' }

function requiredIdentifier(value: unknown, message: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(message)
  return value.trim()
}

function validResendKey(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{8,128}$/.test(value)) throw new Error('resend key invalid')
  return value
}

/** Builds an explicitly authorized, suppression-aware resend command without side effects. */
export function buildInvoiceResendDelivery(input: InvoiceResendInput): InvoiceResendDecision {
  requiredIdentifier(input.authorizedById, 'authorized user required')
  const workspaceId = requiredIdentifier(input.workspaceId, 'workspace id required')
  const formId = requiredIdentifier(input.formId, 'form id required')
  const submissionId = requiredIdentifier(input.submissionId, 'submission id required')
  const invoiceRecordId = requiredIdentifier(input.invoiceRecordId, 'invoice record id required')
  const documentId = requiredIdentifier(input.documentId, 'document id required')
  const resendKey = validResendKey(input.resendKey)

  if (!resendableInvoiceStates.has(input.invoiceState)) throw new Error('invoice delivery state invalid')
  if (input.documentReadyState !== 'verified') throw new Error('document-ready verification required')
  if (input.documentState !== 'quarantined') throw new Error('private quarantine required')
  if (input.scanStatus !== 'clean') throw new Error('clean scan required')
  if (input.suppressed) return { status: 'suppressed', reason: 'recipient_suppressed' }
  if (input.confirmation !== resendConfirmation) {
    return { status: 'duplicate_warning', reason: input.hasPriorDelivery ? 'prior_delivery_exists' : 'confirmation_required' }
  }

  const email = buildInvoiceReadyEmail({ ...input, invoiceState: 'document_ready' })
  return {
    status: 'ready',
    idempotencyKey: `invoice:${invoiceRecordId}:document:${documentId}:email:resend:${resendKey}`,
    channel: deliveryChannel,
    queueClass: deliveryQueueClass,
    outbox: {
      workspaceId,
      formId,
      submissionId,
      type: 'email',
      queueClass: deliveryQueueClass,
      priority: emailQueuePriority(deliveryQueueClass),
      payload: {
        recipientEmail: email.recipientEmail,
        subject: email.email.subject,
        textBody: email.email.text,
        html: email.email.html,
        documentUrl: input.documentUrl,
      },
    },
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'P2002')
}

/** Performs an authorized, audited resend after checking workspace suppression state. */
export async function resendInvoiceDelivery(input: Omit<InvoiceResendInput, 'suppressed' | 'hasPriorDelivery'>, env: NodeJS.ProcessEnv = process.env): Promise<InvoiceResendResult> {
  const hashSecret = env.MAVENFORMS_EMAIL_UNSUBSCRIBE_SECRET || ''
  if (!hashSecret) throw new Error('suppression check unavailable')
  const recipientHash = hashRecipientEmail(input.recipientEmail, hashSecret)
  const [suppressions, prior] = await Promise.all([
    db.emailSuppression.findMany({ where: { workspaceId: input.workspaceId, recipientHash }, select: { scope: true } }),
    db.invoiceDeliveryIntent.findFirst({ where: { invoiceRecordId: input.invoiceRecordId, documentId: input.documentId, channel: deliveryChannel }, select: { id: true } }),
  ])
  const command = buildInvoiceResendDelivery({ ...input, suppressed: suppressions.some(item => item.scope === 'all'), hasPriorDelivery: Boolean(prior) })
  if (command.status !== 'ready') return command

  const where = {
    invoiceRecordId_channel_idempotencyKey: {
      invoiceRecordId: input.invoiceRecordId,
      channel: command.channel,
      idempotencyKey: command.idempotencyKey,
    },
  }
  try {
    return await db.$transaction(async (tx: Prisma.TransactionClient): Promise<InvoiceResendResult> => {
      const existing = await tx.invoiceDeliveryIntent.findUnique({ where, select: { id: true } })
      if (existing) return { status: 'duplicate', deliveryIntentId: existing.id, idempotencyKey: command.idempotencyKey }
      const intent = await tx.invoiceDeliveryIntent.create({
        data: { invoiceRecordId: input.invoiceRecordId, documentId: input.documentId, channel: command.channel, idempotencyKey: command.idempotencyKey, status: 'queued' },
        select: { id: true },
      })
      const outbox = await tx.outboxEvent.create({
        data: { workspaceId: command.outbox.workspaceId, formId: command.outbox.formId, submissionId: command.outbox.submissionId, type: command.outbox.type, queueClass: command.outbox.queueClass, priority: command.outbox.priority, payloadJson: JSON.stringify(command.outbox.payload) },
        select: { id: true },
      })
      await tx.invoiceDeliveryIntent.update({ where: { id: intent.id }, data: { outboxEventId: outbox.id } })
      await tx.auditLog.create({
        data: { workspaceId: input.workspaceId, actorId: input.authorizedById, action: 'invoice.delivery.resend', resourceType: 'invoice_delivery_intent', resourceId: intent.id, beforeJson: null, afterJson: JSON.stringify({ invoiceRecordId: input.invoiceRecordId, documentId: input.documentId, channel: command.channel, idempotencyKey: command.idempotencyKey }) },
      })
      return { status: 'queued', deliveryIntentId: intent.id, outboxEventId: outbox.id, idempotencyKey: command.idempotencyKey }
    })
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error
    const existing = await db.invoiceDeliveryIntent.findUnique({ where, select: { id: true } })
    if (!existing) throw error
    return { status: 'duplicate', deliveryIntentId: existing.id, idempotencyKey: command.idempotencyKey }
  }
}
