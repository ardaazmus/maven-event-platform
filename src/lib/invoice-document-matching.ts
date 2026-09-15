import { matchInvoiceImportRow, type InvoiceMatchCandidate, type InvoiceMatchResult, type InvoiceMatchRow } from '@/lib/invoice-matching'

export type InvoiceDocumentMetadata = Pick<InvoiceMatchRow, 'workspaceId' | 'formId' | 'rowId' | 'paymentReference' | 'providerInvoiceId' | 'invoiceUuid' | 'invoiceNumber' | 'invoiceNumberApproved'> & {
  legalName?: unknown
  email?: unknown
  amountMinor?: unknown
}

export type InvoiceDocumentMatchResult = InvoiceMatchResult & { requiresManualApproval: true }

/** Matches document-supplied metadata only through stable invoice references. */
export function matchInvoiceDocumentMetadata(input: InvoiceDocumentMetadata, candidates: readonly InvoiceMatchCandidate[]): InvoiceDocumentMatchResult {
  return { ...matchInvoiceImportRow(input, candidates), requiresManualApproval: true }
}

export type InvoiceDocumentReadyGate =
  | { allowed: true }
  | { allowed: false; reason: 'match_not_safe' | 'approval_required' | 'invoice_not_issued' | 'scan_required' | 'document_state_invalid' }

/** Requires stable matching, explicit approval and a clean quarantined artifact. */
export function evaluateInvoiceDocumentReady(input: {
  match: InvoiceDocumentMatchResult
  approvalStatus: 'pending' | 'approved' | 'rejected'
  invoiceState: string
  scanStatus: string
  documentState: string
}): InvoiceDocumentReadyGate {
  if (input?.match?.status !== 'matched') return { allowed: false, reason: 'match_not_safe' }
  if (input.approvalStatus !== 'approved') return { allowed: false, reason: 'approval_required' }
  if (input.invoiceState !== 'issued') return { allowed: false, reason: 'invoice_not_issued' }
  if (input.scanStatus !== 'clean') return { allowed: false, reason: 'scan_required' }
  if (input.documentState !== 'quarantined') return { allowed: false, reason: 'document_state_invalid' }
  return { allowed: true }
}
