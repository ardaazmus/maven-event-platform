import type { SessionContext } from '@/lib/policy'
import { can } from '@/lib/policy'
import { db } from '@/lib/db'
import { enqueuePersistedInvoiceReadyDelivery, type InvoiceDocumentReadyDeliveryResult } from '@/lib/invoice-document-ready-delivery'
import { persistInvoiceDocumentReady, type InvoiceDocumentReadyPersistenceResult } from '@/lib/invoice-document-ready-persistence'
import { decryptInvoicePii } from '@/lib/invoice-pii-crypto'
import type { InvoiceDocumentMatchResult } from '@/lib/invoice-document-matching'
import type { PrismaClient } from '@prisma/client'

type ReadyCallerDependencies = {
  persist: typeof persistInvoiceDocumentReady
  enqueue: typeof enqueuePersistedInvoiceReadyDelivery
  readClient: Parameters<typeof enqueuePersistedInvoiceReadyDelivery>[1]
  persistClient: Parameters<typeof persistInvoiceDocumentReady>[1]
  contextClient: Pick<PrismaClient, 'invoiceRecord'>
  decryptPii: typeof decryptInvoicePii
}

export type InvoiceDocumentReadyCallerInput = {
  invoiceRecordId: string
  documentId: string
  documentUrl: string
  appOrigin: string
  match: InvoiceDocumentMatchResult
  approvalStatus: 'pending' | 'approved' | 'rejected'
}

export type InvoiceDocumentReadyCallerResult =
  | { status: 'queued' | 'duplicate'; documentDecision: 'ready' | 'duplicate'; delivery: InvoiceDocumentReadyDeliveryResult }
  | { status: 'blocked'; reason: 'unauthorized' | 'input_invalid' | 'scope_mismatch' | 'decision_required' | 'decision_conflict' | 'match_not_safe' | 'approval_required' | 'invoice_not_issued' | 'scan_required' | 'document_state_invalid' | 'document_not_ready' }

/** Runs the authenticated server flow; the browser never supplies workspace or approval actor identity. */
export async function executeInvoiceDocumentReadyFlow(
  ctx: SessionContext | null,
  input: InvoiceDocumentReadyCallerInput,
  dependencies: Partial<ReadyCallerDependencies> = {},
): Promise<InvoiceDocumentReadyCallerResult> {
  if (!ctx || !can.writeInvoices(ctx).allowed) return { status: 'blocked', reason: 'unauthorized' }
  const deps = { persist: persistInvoiceDocumentReady, enqueue: enqueuePersistedInvoiceReadyDelivery, readClient: db, persistClient: db, contextClient: db, decryptPii: decryptInvoicePii, ...dependencies }
  const decision = await deps.persist({ workspaceId: ctx.workspace.id, invoiceRecordId: input.invoiceRecordId, documentId: input.documentId, match: input.match, approvalStatus: input.approvalStatus, approvedById: ctx.user.id }, deps.persistClient)
  if (decision.status === 'blocked') return decision

  const durable = await deps.contextClient.invoiceRecord.findFirst({
    where: { id: input.invoiceRecordId, workspaceId: ctx.workspace.id, paymentOrder: { workspaceId: ctx.workspace.id } },
    select: {
      invoiceNumber: true,
      paymentOrder: {
        select: {
          formId: true,
          submissionId: true,
          form: { select: { title: true, workspaceId: true } },
          recipientSnapshot: { select: { workspaceId: true, submissionId: true, emailEncrypted: true } },
        },
      },
    },
  })
  const paymentOrder = durable?.paymentOrder
  const snapshot = paymentOrder?.recipientSnapshot
  if (!durable || !paymentOrder || !paymentOrder.submissionId || paymentOrder.form.workspaceId !== ctx.workspace.id || !snapshot || snapshot.workspaceId !== ctx.workspace.id || snapshot.submissionId !== paymentOrder.submissionId || !snapshot.emailEncrypted) return { status: 'blocked', reason: 'scope_mismatch' }

  let recipientEmail: string
  try {
    recipientEmail = deps.decryptPii(snapshot.emailEncrypted)
  } catch {
    return { status: 'blocked', reason: 'input_invalid' }
  }
  if (!recipientEmail.trim() || !paymentOrder.form.title.trim()) return { status: 'blocked', reason: 'input_invalid' }

  const delivery = await deps.enqueue({
    workspaceId: ctx.workspace.id,
    formId: paymentOrder.formId,
    submissionId: paymentOrder.submissionId,
    invoiceRecordId: input.invoiceRecordId,
    documentId: input.documentId,
    invoiceState: 'document_ready',
    documentState: 'quarantined',
    scanStatus: 'clean',
    recipientEmail,
    formTitle: paymentOrder.form.title,
    invoiceNumber: durable.invoiceNumber,
    documentUrl: input.documentUrl,
    appOrigin: input.appOrigin,
  }, deps.readClient)
  if (delivery.status === 'blocked') return delivery
  return { status: delivery.status, documentDecision: decision.status, delivery }
}
