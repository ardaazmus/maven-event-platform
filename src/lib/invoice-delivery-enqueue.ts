import type { Prisma, PrismaClient } from '@prisma/client'
import { buildInvoiceReadyEmail } from '@/lib/invoice-email'
import { emailQueuePriority } from '@/lib/email-queue'
import { db } from '@/lib/db'

const deliveryChannel = 'email' as const
const deliveryQueueClass = 'transactional' as const

export type InvoiceReadyDeliveryInput = {
  workspaceId: string
  formId: string
  submissionId: string
  invoiceRecordId: string
  documentId: string
  invoiceState: string
  documentState: string
  scanStatus: string
  recipientEmail: string
  formTitle: string
  invoiceNumber?: string | null
  documentUrl: string
  appOrigin: string
}

export type InvoiceReadyDeliveryCommand = {
  status: 'ready'
  channel: typeof deliveryChannel
  queueClass: typeof deliveryQueueClass
  idempotencyKey: string
  delivery: {
    invoiceRecordId: string
    documentId: string
    status: 'queued'
  }
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

export type InvoiceReadyDeliveryResult =
  | { status: 'queued'; deliveryIntentId: string; outboxEventId: string; idempotencyKey: string }
  | { status: 'duplicate'; deliveryIntentId: string; idempotencyKey: string }

function requiredIdentifier(value: unknown, message: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(message)
  return value.trim()
}

function buildIdempotencyKey(invoiceRecordId: string, documentId: string): string {
  return `invoice:${invoiceRecordId}:document:${documentId}:email:v1`
}

/** Builds a safe, deterministic transactional delivery command without side effects. */
export function buildInvoiceReadyDelivery(input: InvoiceReadyDeliveryInput): InvoiceReadyDeliveryCommand {
  const workspaceId = requiredIdentifier(input.workspaceId, 'workspace id required')
  const formId = requiredIdentifier(input.formId, 'form id required')
  const submissionId = requiredIdentifier(input.submissionId, 'submission id required')
  const invoiceRecordId = requiredIdentifier(input.invoiceRecordId, 'invoice record id required')
  const documentId = requiredIdentifier(input.documentId, 'document id required')

  if (input.invoiceState !== 'document_ready') throw new Error('document_ready required')
  if (input.scanStatus !== 'clean') throw new Error('clean scan required')
  if (input.documentState !== 'quarantined') throw new Error('private quarantine required')
  if (typeof input.recipientEmail !== 'string' || !input.recipientEmail.trim()) throw new Error('recipient email required')

  const email = buildInvoiceReadyEmail(input)
  const idempotencyKey = buildIdempotencyKey(invoiceRecordId, documentId)
  return {
    status: 'ready',
    channel: deliveryChannel,
    queueClass: deliveryQueueClass,
    idempotencyKey,
    delivery: { invoiceRecordId, documentId, status: 'queued' },
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

/** Persists one document-ready intent and its outbox event in a single transaction. */
export async function enqueueInvoiceReadyDelivery(
  input: InvoiceReadyDeliveryInput,
  client: Pick<PrismaClient, '$transaction' | 'invoiceDeliveryIntent'> = db,
): Promise<InvoiceReadyDeliveryResult> {
  const command = buildInvoiceReadyDelivery(input)
  // Recheck durable scope and document health inside the enqueue transaction.
  // Caller-provided state strings are not evidence of ownership or a clean scan.
  const invoiceScope = {
    id: command.delivery.invoiceRecordId,
    workspaceId: command.outbox.workspaceId,
    paymentOrder: {
      workspaceId: command.outbox.workspaceId,
      formId: command.outbox.formId,
      submissionId: command.outbox.submissionId,
      form: { workspaceId: command.outbox.workspaceId },
      submission: { formId: command.outbox.formId },
    },
  }
  const documentScope = {
    id: command.delivery.documentId,
    invoiceRecordId: command.delivery.invoiceRecordId,
    visibility: 'private',
    state: 'quarantined',
    scanStatus: 'clean',
    invoiceRecord: invoiceScope,
  }
  const where = {
    invoiceRecordId_channel_idempotencyKey: {
      invoiceRecordId: command.delivery.invoiceRecordId,
      channel: command.channel,
      idempotencyKey: command.idempotencyKey,
    },
  }

  try {
    return await client.$transaction(async (tx: Prisma.TransactionClient): Promise<InvoiceReadyDeliveryResult> => {
      const invoice = await tx.invoiceRecord.findFirst({ where: invoiceScope, select: { state: true } })
      if (!invoice) throw new Error('invoice delivery scope mismatch')
      const document = await tx.invoiceDocument.findFirst({ where: documentScope, select: { id: true } })
      if (!document) throw new Error('invoice delivery document is not eligible')
      const existing = await tx.invoiceDeliveryIntent.findUnique({ where, select: { id: true } })
      if (existing) return { status: 'duplicate', deliveryIntentId: existing.id, idempotencyKey: command.idempotencyKey }
      if (invoice.state !== 'document_ready') throw new Error('stored invoice is not document_ready')

      const intent = await tx.invoiceDeliveryIntent.create({
        data: {
          invoiceRecordId: command.delivery.invoiceRecordId,
          documentId: command.delivery.documentId,
          channel: command.channel,
          idempotencyKey: command.idempotencyKey,
          status: 'queued',
        },
        select: { id: true },
      })
      const outbox = await tx.outboxEvent.create({
        data: {
          workspaceId: command.outbox.workspaceId,
          formId: command.outbox.formId,
          submissionId: command.outbox.submissionId,
          type: command.outbox.type,
          queueClass: command.outbox.queueClass,
          priority: command.outbox.priority,
          payloadJson: JSON.stringify(command.outbox.payload),
        },
        select: { id: true },
      })
      await tx.invoiceDeliveryIntent.update({ where: { id: intent.id }, data: { outboxEventId: outbox.id } })
      const transitioned = await tx.invoiceRecord.updateMany({
        where: { ...invoiceScope, state: 'document_ready', documents: { some: documentScope } },
        data: { state: 'delivery_queued' },
      })
      if (transitioned.count !== 1) throw new Error('invoice state changed before delivery enqueue')
      return { status: 'queued', deliveryIntentId: intent.id, outboxEventId: outbox.id, idempotencyKey: command.idempotencyKey }
    })
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error
    const existing = await client.invoiceDeliveryIntent.findFirst({
      where: {
        invoiceRecordId: command.delivery.invoiceRecordId,
        channel: command.channel,
        idempotencyKey: command.idempotencyKey,
        documentId: command.delivery.documentId,
        invoiceRecord: invoiceScope,
        document: documentScope,
      },
      select: { id: true },
    })
    if (!existing) throw error
    return { status: 'duplicate', deliveryIntentId: existing.id, idempotencyKey: command.idempotencyKey }
  }
}
