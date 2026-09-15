import assert from 'node:assert/strict'
import { classifyInvoiceDocumentType } from '../src/lib/invoice-document-type-policy.ts'
import { evaluateInvoiceTransition } from '../src/lib/invoice-state.ts'
import { validateInvoiceRecipient } from '../src/lib/invoice-recipient-validation.ts'

const companyBase = {
  recipientType: 'company',
  legalName: 'Anonim Test Sirketi',
  countryCode: 'TR',
  taxNumber: '1234567890',
  taxOffice: 'Merkez',
  email: 'buyer@example.test',
}

const policyBase = {
  recipientType: 'company',
  countryCode: 'TR',
  taxNumber: '1234567890',
  inboxResult: { ok: true, data: { taxNumber: '1234567890', found: true, checkedAt: '2026-09-05T12:00:00.000Z' } },
  businessPolicy: { eInvoiceEnabled: true, eArchiveEnabled: true, allowAutomaticClassification: true },
  accountingDecision: 'approved',
}

assert.deepEqual(validateInvoiceRecipient(companyBase), { status: 'valid', codes: [] })
assert.deepEqual(classifyInvoiceDocumentType(policyBase), {
  status: 'classified', documentType: 'e_invoice', reason: 'registered_in_e_invoice_inbox', requiresAccountingApproval: false,
})
assert.deepEqual(classifyInvoiceDocumentType({ ...policyBase, inboxResult: { ok: true, data: { ...policyBase.inboxResult.data, found: false } } }), {
  status: 'classified', documentType: 'e_archive', reason: 'not_registered_in_e_invoice_inbox', requiresAccountingApproval: false,
})

assert.deepEqual(validateInvoiceRecipient({ ...companyBase, taxNumber: undefined }), {
  status: 'review_required', codes: ['tax_number_review_required'],
})
assert.deepEqual(classifyInvoiceDocumentType({ ...policyBase, taxNumber: undefined }), {
  status: 'accounting_review_required', reason: 'tax_number_required',
})

assert.deepEqual(validateInvoiceRecipient({
  recipientType: 'individual', legalName: 'Anonim Kisi', countryCode: 'TR', email: 'person@example.test',
}), { status: 'review_required', codes: ['identity_number_review_required'] })
assert.deepEqual(classifyInvoiceDocumentType({ ...policyBase, recipientType: 'individual' }), {
  status: 'accounting_review_required', reason: 'recipient_not_supported',
})

assert.deepEqual(validateInvoiceRecipient({
  recipientType: 'foreign', legalName: 'Foreign Customer', countryCode: 'DE', email: 'foreign@example.test',
}), { status: 'review_required', codes: ['foreign_identifier_review_required'] })
assert.deepEqual(classifyInvoiceDocumentType({ ...policyBase, recipientType: 'foreign', countryCode: 'DE' }), {
  status: 'accounting_review_required', reason: 'recipient_not_supported',
})

assert.deepEqual(classifyInvoiceDocumentType({ ...policyBase, inboxResult: { ok: false, error: { code: 'unavailable', kind: 'unavailable', providerStatus: null, retryable: true } } }), {
  status: 'accounting_review_required', reason: 'lookup_failed',
})

assert.deepEqual(evaluateInvoiceTransition('paid_ready_for_invoicing', 'refund_or_credit_note_review'), {
  accepted: true, changed: true, status: 'refund_or_credit_note_review',
})
assert.deepEqual(evaluateInvoiceTransition('refund_or_credit_note_review', 'issued'), {
  accepted: false, changed: false, status: 'refund_or_credit_note_review', reason: 'transition_not_allowed',
})
assert.deepEqual(evaluateInvoiceTransition('issued', 'document_ready'), {
  accepted: true, changed: true, status: 'document_ready',
})

const noSensitiveFixture = JSON.stringify({ ...companyBase, taxNumber: '0000000000', identityNumber: '00000000000' })
assert(!noSensitiveFixture.includes('secret'))
console.log('PASS accounting acceptance matrix tests (synthetic/anonymized; legal approval remains external)')
