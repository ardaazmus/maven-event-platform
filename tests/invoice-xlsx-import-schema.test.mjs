import assert from 'node:assert/strict'
import {
  INVOICE_IMPORT_FORMAT_VERSION,
  INVOICE_REQUIRED_COLUMNS,
  validateInvoiceImportSchema,
} from '../src/lib/invoice-xlsx-import.ts'

const headers = ['invoice_number', 'format_version', ...INVOICE_REQUIRED_COLUMNS.filter(column => !['invoice_number', 'format_version'].includes(column))]
const rows = [
  ['INV-1', INVOICE_IMPORT_FORMAT_VERSION, 'batch_1', 'row_1', 'payref_1', 'manual', 'e_archive', 'individual', 'Ada Example', 'TR', 'ada@example.com', '', '', '', '', '12500', '2083', '2000', 'TRY', 'uuid-1'],
]

const valid = validateInvoiceImportSchema({ headers, rows })
assert.equal(valid.ok, true, 'valid version and required columns must pass')
if (valid.ok) {
  assert.equal(valid.formatVersion, INVOICE_IMPORT_FORMAT_VERSION)
  assert.equal(valid.columns.length, INVOICE_REQUIRED_COLUMNS.length)
  assert.equal(valid.rows[0].row_id, 'row_1')
  assert.equal(valid.rows[0].payment_reference, 'payref_1')
}

const wrongVersion = validateInvoiceImportSchema({
  headers: INVOICE_REQUIRED_COLUMNS,
  rows: [['invoice-batch-v0', 'batch_1', 'row_1', 'payref_1', ...Array(INVOICE_REQUIRED_COLUMNS.length - 4).fill('')]],
})
assert.equal(wrongVersion.ok, false, 'unsupported version must fail closed')
if (!wrongVersion.ok) assert.deepEqual(wrongVersion.errors[0], { code: 'unsupported_version', row: 2, column: 'format_version' })

const missingColumn = validateInvoiceImportSchema({
  headers: INVOICE_REQUIRED_COLUMNS.filter(column => column !== 'payment_reference'),
  rows: [],
})
assert.equal(missingColumn.ok, false, 'missing required column must fail closed')
if (!missingColumn.ok) assert.deepEqual(missingColumn.errors[0], { code: 'required_column_missing', row: null, column: 'payment_reference' })

const duplicate = validateInvoiceImportSchema({ headers: [...INVOICE_REQUIRED_COLUMNS, 'row_id'], rows: [] })
assert.equal(duplicate.ok, false, 'duplicate columns must fail closed')
if (!duplicate.ok) assert.deepEqual(duplicate.errors[0], { code: 'duplicate_column', row: 1, column: 'row_id' })

const widthMismatch = validateInvoiceImportSchema({ headers: INVOICE_REQUIRED_COLUMNS, rows: [['invoice-batch-v1']] })
assert.equal(widthMismatch.ok, false, 'row width mismatch must fail closed')
if (!widthMismatch.ok) assert.deepEqual(widthMismatch.errors[0], { code: 'row_width_mismatch', row: 2, column: null })

console.log('invoice-xlsx-import-schema.test: PASS (INV/F-I-01-01)')
