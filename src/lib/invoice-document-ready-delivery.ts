import type { PrismaClient } from '@prisma/client'
import { enqueueInvoiceReadyDelivery, type InvoiceReadyDeliveryInput, type InvoiceReadyDeliveryResult } from '@/lib/invoice-delivery-enqueue'

type ReadyDeliveryReadClient = Pick<PrismaClient, 'invoiceDocument'>
type ReadyDeliveryEnqueuer = (input: InvoiceReadyDeliveryInput) => Promise<InvoiceReadyDeliveryResult>

export type InvoiceDocumentReadyDeliveryResult = InvoiceReadyDeliveryResult | { status: 'blocked'; reason: 'input_invalid' | 'document_not_ready' | 'scope_mismatch' }

/** Rechecks the durable ready artifact before delegating to the shared transactional enqueue path. */
export async function enqueuePersistedInvoiceReadyDelivery(
  input: InvoiceReadyDeliveryInput,
  readClient: ReadyDeliveryReadClient,
  enqueue: ReadyDeliveryEnqueuer = enqueueInvoiceReadyDelivery,
): Promise<InvoiceDocumentReadyDeliveryResult> {
  if (!input.workspaceId.trim() || !input.invoiceRecordId.trim() || !input.documentId.trim()) return { status: 'blocked', reason: 'input_invalid' }
  const document = await readClient.invoiceDocument.findFirst({
    where: {
      id: input.documentId,
      invoiceRecordId: input.invoiceRecordId,
      state: 'quarantined',
      scanStatus: 'clean',
      readyAt: { not: null },
      invoiceRecord: { id: input.invoiceRecordId, workspaceId: input.workspaceId, paymentOrder: { workspaceId: input.workspaceId } },
    },
    select: { id: true, state: true, scanStatus: true, invoiceRecord: { select: { state: true, paymentOrder: { select: { formId: true, submissionId: true } } } } },
  })
  if (!document) return { status: 'blocked', reason: 'document_not_ready' }
  if (document.invoiceRecord.state !== 'document_ready' || document.state !== 'quarantined' || document.scanStatus !== 'clean') return { status: 'blocked', reason: 'document_not_ready' }

  return enqueue({
    ...input,
    formId: document.invoiceRecord.paymentOrder.formId,
    submissionId: document.invoiceRecord.paymentOrder.submissionId ?? input.submissionId,
    invoiceState: document.invoiceRecord.state,
    documentState: document.state,
    scanStatus: document.scanStatus,
  })
}
