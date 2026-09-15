import type { PrismaClient } from '@prisma/client'
import { buildInvoiceDocumentReadyTransition } from '@/lib/invoice-document-ready-transition'
import type { InvoiceDocumentMatchResult } from '@/lib/invoice-document-matching'

type ReadyPersistenceClient = Pick<PrismaClient, '$transaction'>

export type InvoiceDocumentReadyPersistenceInput = {
  workspaceId: string
  invoiceRecordId: string
  documentId: string
  match: InvoiceDocumentMatchResult
  approvalStatus: 'pending' | 'approved' | 'rejected'
  approvedById: string
}

export type InvoiceDocumentReadyPersistenceResult =
  | { status: 'ready'; invoiceRecordId: string; documentId: string }
  | { status: 'duplicate'; invoiceRecordId: string; documentId: string }
  | { status: 'blocked'; reason: 'input_invalid' | 'scope_mismatch' | 'decision_required' | 'decision_conflict' | 'match_not_safe' | 'approval_required' | 'invoice_not_issued' | 'scan_required' | 'document_state_invalid' }

function required(value: string): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

/** Persists one verified document-ready transition; it never enqueues delivery. */
export async function persistInvoiceDocumentReady(
  input: InvoiceDocumentReadyPersistenceInput,
  client: ReadyPersistenceClient,
): Promise<InvoiceDocumentReadyPersistenceResult> {
  if (!required(input.workspaceId) || !required(input.invoiceRecordId) || !required(input.documentId) || !required(input.approvedById)) return { status: 'blocked', reason: 'input_invalid' }

  return client.$transaction(async tx => {
    const document = await tx.invoiceDocument.findFirst({
      where: {
        id: input.documentId,
        invoiceRecordId: input.invoiceRecordId,
        state: 'quarantined',
        invoiceRecord: { id: input.invoiceRecordId, workspaceId: input.workspaceId, paymentOrder: { workspaceId: input.workspaceId } },
      },
      select: { id: true, state: true, scanStatus: true, readyAt: true, invoiceRecord: { select: { id: true, state: true } } },
    })
    if (!document) return { status: 'blocked', reason: 'scope_mismatch' }

    const durableDecision = await tx.invoiceDocumentDecision.findFirst({
      where: { workspaceId: input.workspaceId, invoiceDocumentId: input.documentId, invoiceRecordId: input.invoiceRecordId, matchStatus: 'matched', matchedInvoiceRecordId: input.invoiceRecordId, approvalStatus: 'approved' },
      select: { matchStrategy: true, matchedInvoiceRecordId: true, approvedById: true },
    })
    if (!durableDecision?.approvedById || !durableDecision.matchStrategy || durableDecision.matchedInvoiceRecordId !== input.invoiceRecordId) return { status: 'blocked', reason: 'decision_required' }
    if (input.match.status !== 'matched' || input.match.strategy !== durableDecision.matchStrategy || input.match.candidateId !== durableDecision.matchedInvoiceRecordId || input.approvalStatus !== 'approved') return { status: 'blocked', reason: 'decision_conflict' }
    if (document.invoiceRecord.state === 'document_ready' && document.readyAt) return { status: 'duplicate', invoiceRecordId: input.invoiceRecordId, documentId: input.documentId }
    if (document.invoiceRecord.id !== input.invoiceRecordId) return { status: 'blocked', reason: 'match_not_safe' }

    const decision = buildInvoiceDocumentReadyTransition({
      match: input.match,
      approvalStatus: input.approvalStatus,
      invoiceRecordId: input.invoiceRecordId,
      matchedInvoiceRecordId: input.match.candidateId,
      invoiceState: document.invoiceRecord.state,
      scanStatus: document.scanStatus,
      documentState: document.state,
    })
    if (decision.status === 'blocked') return decision

    const markedReady = await tx.invoiceDocument.updateMany({ where: { id: document.id, invoiceRecordId: input.invoiceRecordId, state: 'quarantined', scanStatus: 'clean', readyAt: null }, data: { readyAt: new Date() } })
    if (markedReady.count !== 1) throw new Error('invoice document ready claim lost')
    const transitioned = await tx.invoiceRecord.updateMany({ where: { id: input.invoiceRecordId, workspaceId: input.workspaceId, state: 'issued' }, data: { state: 'document_ready' } })
    if (transitioned.count !== 1) throw new Error('invoice document ready invoice transition lost')
    await tx.auditLog.create({ data: { workspaceId: input.workspaceId, actorId: input.approvedById, action: 'invoice.document.ready', resourceType: 'invoice_document', resourceId: document.id, beforeJson: JSON.stringify({ invoiceState: 'issued', readyAt: null }), afterJson: JSON.stringify({ invoiceRecordId: input.invoiceRecordId, documentId: document.id, invoiceState: 'document_ready', readyAt: 'set' }) } })
    return { status: 'ready', invoiceRecordId: input.invoiceRecordId, documentId: document.id }
  })
}
