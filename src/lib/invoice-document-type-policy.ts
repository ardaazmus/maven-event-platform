import type { ParasutEInvoiceInbox } from '@/lib/providers/parasut-v4'
import type { ParasutResult } from '@/lib/providers/parasut-v4'

export type InvoiceDocumentType = 'e_invoice' | 'e_archive'

export type InvoiceDocumentTypePolicyInput = {
  recipientType: 'individual' | 'company' | 'foreign' | string
  countryCode: string | null | undefined
  taxNumber: string | null | undefined
  inboxResult: ParasutResult<ParasutEInvoiceInbox>
  businessPolicy: { eInvoiceEnabled: boolean; eArchiveEnabled: boolean; allowAutomaticClassification: boolean }
  accountingDecision: 'approved' | 'pending' | 'rejected'
  requestedDocumentType?: InvoiceDocumentType
}

export type InvoiceDocumentTypePolicyResult =
  | { status: 'classified'; documentType: InvoiceDocumentType; reason: 'registered_in_e_invoice_inbox' | 'not_registered_in_e_invoice_inbox'; requiresAccountingApproval: false }
  | { status: 'accounting_review_required'; reason: 'recipient_not_supported' | 'country_not_supported' | 'tax_number_required' | 'lookup_failed' | 'snapshot_invalid' | 'business_capability_unavailable' | 'accounting_approval_required' | 'requested_type_conflicts' }

function validVkn(value: string | null | undefined): boolean {
  return typeof value === 'string' && /^\d{10}$/.test(value)
}

function validIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value) && !Number.isNaN(Date.parse(value))
}

function review(reason: Extract<InvoiceDocumentTypePolicyResult, { status: 'accounting_review_required' }>['reason']): InvoiceDocumentTypePolicyResult {
  return { status: 'accounting_review_required', reason }
}

/** Classifies e-Fatura/e-Arşiv only after provider lookup, recipient, capability and accounting gates agree. */
export function classifyInvoiceDocumentType(input: InvoiceDocumentTypePolicyInput): InvoiceDocumentTypePolicyResult {
  if (input.recipientType !== 'company') return review('recipient_not_supported')
  if ((input.countryCode ?? '').trim().toUpperCase() !== 'TR') return review('country_not_supported')
  if (!validVkn(input.taxNumber)) return review('tax_number_required')
  if (!input.businessPolicy.allowAutomaticClassification || input.accountingDecision !== 'approved') return review('accounting_approval_required')
  if (!input.inboxResult.ok) return review('lookup_failed')

  const snapshot = input.inboxResult.data
  if (snapshot.taxNumber !== input.taxNumber || typeof snapshot.found !== 'boolean' || !validIsoDate(snapshot.checkedAt)) return review('snapshot_invalid')
  const documentType: InvoiceDocumentType = snapshot.found ? 'e_invoice' : 'e_archive'
  if (input.requestedDocumentType && input.requestedDocumentType !== documentType) return review('requested_type_conflicts')
  if (documentType === 'e_invoice' && !input.businessPolicy.eInvoiceEnabled) return review('business_capability_unavailable')
  if (documentType === 'e_archive' && !input.businessPolicy.eArchiveEnabled) return review('business_capability_unavailable')

  return {
    status: 'classified',
    documentType,
    reason: snapshot.found ? 'registered_in_e_invoice_inbox' : 'not_registered_in_e_invoice_inbox',
    requiresAccountingApproval: false,
  }
}
