import assert from 'node:assert/strict'
import { INVOICE_XLSX_COLUMNS, mapInvoiceInterchangeRow } from '../src/lib/invoice-xlsx-export.ts'

const row = mapInvoiceInterchangeRow({
  formatVersion: 'invoice-batch-v1',
  batchId: 'batch_1',
  rowId: 'row_1',
  paymentReference: 'payref_1',
  invoice: {
    provider: 'stripe',
    documentType: 'e_archive',
    amountMinor: 12500,
    currency: 'TRY',
    taxAmountMinor: 2083,
    taxRateBps: 2000,
    invoiceNumber: 'EARSIV-1',
    invoiceUuid: 'uuid-1',
    recipient: {
      recipientType: 'company',
      legalName: 'Örnek A.Ş.',
      countryCode: 'TR',
      email: 'billing@example.com',
      taxNumber: '1234567890',
      identityNumber: null,
      taxOffice: 'Kadıköy',
      billingAddress: 'İstanbul',
    },
  },
  clientAmountMinor: 1,
  formPriceMinor: 2,
})

assert.deepEqual(INVOICE_XLSX_COLUMNS, [
  'format_version', 'batch_id', 'row_id', 'payment_reference', 'provider', 'document_type',
  'recipient_type', 'legal_name', 'country_code', 'email', 'tax_number', 'identity_number',
  'tax_office', 'billing_address', 'amount_minor', 'tax_amount_minor', 'tax_rate_bps',
  'currency', 'invoice_number', 'invoice_uuid',
])
assert.deepEqual(row, [
  'invoice-batch-v1', 'batch_1', 'row_1', 'payref_1', 'stripe', 'e_archive',
  'company', 'Örnek A.Ş.', 'TR', 'billing@example.com', '1234567890', '',
  'Kadıköy', 'İstanbul', '12500', '2083', '2000', 'TRY', 'EARSIV-1', 'uuid-1',
])
assert.notEqual(row[14], '1', 'mapper must use verified invoice amount, not client amount')
assert.notEqual(row[14], '2', 'mapper must use verified invoice amount, not form price')

const formulaRecipient = mapInvoiceInterchangeRow({
  formatVersion: 'invoice-batch-v1',
  batchId: 'batch_1',
  rowId: 'row_2',
  paymentReference: 'payref_2',
  invoice: {
    provider: 'stripe', documentType: 'e_archive', amountMinor: 12500, currency: 'TRY',
    recipient: { legalName: '=2+2', email: '+malicious@example.com' },
  },
})
assert(formulaRecipient.every(value => !/^[=+\-@]/.test(value)), 'spreadsheet cells must not begin with formula operators')

assert.throws(() => mapInvoiceInterchangeRow({
  formatVersion: 'invoice-batch-v1', batchId: 'batch_1', rowId: 'row_1', paymentReference: 'payref_1',
  invoice: { provider: 'stripe', documentType: 'e_archive', amountMinor: 0, currency: 'TRY' },
}), /invoice_row_invalid/)

console.log('invoice-xlsx-columns.test: PASS (INV/F-X-04-01)')
