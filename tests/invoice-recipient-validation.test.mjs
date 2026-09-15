import assert from 'node:assert/strict'
import { validateInvoiceRecipient } from '../src/lib/invoice-recipient-validation.ts'

assert.deepEqual(validateInvoiceRecipient({
  recipientType: 'individual',
  legalName: 'Test Kişi',
  countryCode: 'TR',
  identityNumber: '10000000146',
  email: 'test@example.com',
}), { status: 'valid', codes: [] })

assert.deepEqual(validateInvoiceRecipient({
  recipientType: 'company',
  legalName: 'Test Şirketi',
  countryCode: 'TR',
  taxNumber: '123',
  taxOffice: 'Merkez',
}), { status: 'invalid', codes: ['tax_number_invalid'] })

assert.deepEqual(validateInvoiceRecipient({
  recipientType: 'company',
  legalName: 'Test Şirketi',
  countryCode: 'TR',
}), { status: 'review_required', codes: ['tax_number_review_required', 'tax_office_review_required'] })

assert.deepEqual(validateInvoiceRecipient({
  recipientType: 'foreign',
  legalName: 'Foreign Customer',
  countryCode: 'DE',
  email: 'foreign@example.com',
}), { status: 'review_required', codes: ['foreign_identifier_review_required'] })

const unsafe = validateInvoiceRecipient({
  recipientType: 'individual',
  legalName: 'Test',
  countryCode: 'TR',
  identityNumber: '00000000000',
})
assert.deepEqual(unsafe, { status: 'invalid', codes: ['identity_number_invalid'] })
assert(!JSON.stringify(unsafe).includes('00000000000'), 'validation result must not echo identity data')

console.log('invoice-recipient-validation.test: PASS (INV/F C-01)')
