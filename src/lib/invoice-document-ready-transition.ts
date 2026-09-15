import { evaluateInvoiceDocumentReady, type InvoiceDocumentMatchResult } from '@/lib/invoice-document-matching'

export type InvoiceDocumentReadyTransitionInput = {
  match: InvoiceDocumentMatchResult
  approvalStatus: 'pending' | 'approved' | 'rejected'
  invoiceRecordId: string
  matchedInvoiceRecordId: string | null
  invoiceState: string
  scanStatus: string
  documentState: string
}

export type InvoiceDocumentReadyTransitionResult =
  | { status: 'ready'; invoiceState: 'document_ready'; documentState: 'quarantined'; readyAtRequired: true }
  | { status: 'blocked'; reason: 'match_not_safe' | 'approval_required' | 'invoice_not_issued' | 'scan_required' | 'document_state_invalid' }

/** Builds the server-side document-ready decision without mutating state or enqueueing delivery. */
export function buildInvoiceDocumentReadyTransition(input: InvoiceDocumentReadyTransitionInput): InvoiceDocumentReadyTransitionResult {
  const gate = evaluateInvoiceDocumentReady(input)
  if (!gate.allowed) return { status: 'blocked', reason: gate.reason }
  if (!input.invoiceRecordId.trim() || input.matchedInvoiceRecordId !== input.invoiceRecordId) return { status: 'blocked', reason: 'match_not_safe' }
  return { status: 'ready', invoiceState: 'document_ready', documentState: 'quarantined', readyAtRequired: true }
}
