import assert from 'node:assert/strict'
import { INVOICE_IMPORT_FORMAT_VERSION, INVOICE_REQUIRED_COLUMNS, validateInvoiceImportRows } from '../src/lib/invoice-xlsx-import.ts'

const validRow = {
  format_version: INVOICE_IMPORT_FORMAT_VERSION,
  batch_id: 'batch_1',
  row_id: 'row_1',
  payment_reference: 'payref_1',
  provider: 'manual',
  document_type: 'e_archive',
  recipient_type: 'individual',
  legal_name: 'Ada Example',
  country_code: 'TR',
  email: 'ada@example.com',
  tax_number: '',
  identity_number: '10000000146',
  tax_office: '',
  billing_address: 'İstanbul',
  amount_minor: '12500',
  tax_amount_minor: '2083',
  tax_rate_bps: '2000',
  currency: 'TRY',
  invoice_number: 'GIB2026000000001',
  invoice_uuid: '',
  invoice_date: '2026-09-04',
}

const valid = validateInvoiceImportRows({ columns: [...INVOICE_REQUIRED_COLUMNS, 'invoice_date'], rows: [validRow] })
assert.equal(valid.status, 'valid', 'valid accounting row must pass')
assert.equal(valid.rows[0].status, 'valid')

const invalidAmount = validateInvoiceImportRows({
  columns: [...INVOICE_REQUIRED_COLUMNS, 'invoice_date'],
  rows: [{ ...validRow, amount_minor: '12.50' }],
})
assert.equal(invalidAmount.status, 'invalid')
assert.deepEqual(invalidAmount.rows[0].errors, [{ code: 'amount_minor_invalid', row: 2, column: 'amount_minor' }])

const invalidIdentity = validateInvoiceImportRows({
  columns: [...INVOICE_REQUIRED_COLUMNS, 'invoice_date'],
  rows: [{ ...validRow, identity_number: '00000000000' }],
})
assert.equal(invalidIdentity.status, 'invalid')
assert.deepEqual(invalidIdentity.rows[0].errors, [{ code: 'identity_number_invalid', row: 2, column: 'identity_number' }])
assert(!JSON.stringify(invalidIdentity).includes('00000000000'), 'validation errors must not echo PII')

const missingDocumentIdentity = validateInvoiceImportRows({
  columns: [...INVOICE_REQUIRED_COLUMNS, 'invoice_date'],
  rows: [{ ...validRow, invoice_number: '', invoice_uuid: '' }],
})
assert.deepEqual(missingDocumentIdentity.rows[0].errors, [{ code: 'invoice_identity_missing', row: 2, column: 'invoice_number' }])

const invalidDate = validateInvoiceImportRows({
  columns: [...INVOICE_REQUIRED_COLUMNS, 'invoice_date'],
  rows: [{ ...validRow, invoice_date: '04/09/2026' }],
})
assert.deepEqual(invalidDate.rows[0].errors, [{ code: 'invoice_date_invalid', row: 2, column: 'invoice_date' }])

const reviewRequired = validateInvoiceImportRows({
  columns: [...INVOICE_REQUIRED_COLUMNS, 'invoice_date'],
  rows: [{ ...validRow, recipient_type: 'company', identity_number: '', tax_number: '', tax_office: '' }],
})
assert.equal(reviewRequired.status, 'review_required', 'fiscal uncertainty must stop for review, not become a silent success')
assert.equal(reviewRequired.rows[0].status, 'review_required')

console.log('invoice-xlsx-import-validation.test: PASS (INV/F-I-02-01)')
