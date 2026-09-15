import assert from 'node:assert/strict'
import { classifyInvoiceDocumentType } from '../src/lib/invoice-document-type-policy.ts'

const base = {
  recipientType: 'company',
  countryCode: 'TR',
  taxNumber: '1234567890',
  inboxResult: { ok: true, data: { taxNumber: '1234567890', found: true, checkedAt: '2026-09-05T12:00:00.000Z' } },
  businessPolicy: { eInvoiceEnabled: true, eArchiveEnabled: true, allowAutomaticClassification: true },
  accountingDecision: 'approved',
}

assert.deepEqual(classifyInvoiceDocumentType(base), {
  status: 'classified', documentType: 'e_invoice', reason: 'registered_in_e_invoice_inbox', requiresAccountingApproval: false,
})

assert.deepEqual(classifyInvoiceDocumentType({ ...base, inboxResult: { ok: true, data: { ...base.inboxResult.data, found: false } } }), {
  status: 'classified', documentType: 'e_archive', reason: 'not_registered_in_e_invoice_inbox', requiresAccountingApproval: false,
})

assert.deepEqual(classifyInvoiceDocumentType({ ...base, recipientType: 'individual' }), { status: 'accounting_review_required', reason: 'recipient_not_supported' })
assert.deepEqual(classifyInvoiceDocumentType({ ...base, countryCode: 'DE' }), { status: 'accounting_review_required', reason: 'country_not_supported' })
assert.deepEqual(classifyInvoiceDocumentType({ ...base, taxNumber: null }), { status: 'accounting_review_required', reason: 'tax_number_required' })
assert.deepEqual(classifyInvoiceDocumentType({ ...base, inboxResult: { ok: false, error: { code: 'unavailable', kind: 'unavailable', providerStatus: null, retryable: true } } }), { status: 'accounting_review_required', reason: 'lookup_failed' })
assert.deepEqual(classifyInvoiceDocumentType({ ...base, accountingDecision: 'pending' }), { status: 'accounting_review_required', reason: 'accounting_approval_required' })
assert.deepEqual(classifyInvoiceDocumentType({ ...base, businessPolicy: { ...base.businessPolicy, eInvoiceEnabled: false } }), { status: 'accounting_review_required', reason: 'business_capability_unavailable' })
assert.deepEqual(classifyInvoiceDocumentType({ ...base, requestedDocumentType: 'e_archive' }), { status: 'accounting_review_required', reason: 'requested_type_conflicts' })
assert.deepEqual(classifyInvoiceDocumentType({ ...base, inboxResult: { ok: true, data: { ...base.inboxResult.data, taxNumber: '9999999999' } } }), { status: 'accounting_review_required', reason: 'snapshot_invalid' })

console.log('PASS invoice document type policy tests')
