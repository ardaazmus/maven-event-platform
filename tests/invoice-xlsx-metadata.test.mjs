import assert from 'node:assert/strict'
import { buildInvoiceXlsxMetadata, createInvoiceMetadataXlsx } from '../src/lib/invoice-xlsx-export.ts'

const input = {
  workspaceId: 'workspace_1',
  batchId: 'batch_1',
  rows: [
    { rowNumber: 1, paymentOrderIdSnapshot: 'order_1' },
    { rowNumber: 2, paymentOrderIdSnapshot: 'order_2' },
  ],
}

const metadata = buildInvoiceXlsxMetadata(input)
assert.equal(metadata.formatVersion, 'invoice-batch-v1')
assert.equal(metadata.batchId, 'batch_1')
assert.equal(metadata.rows.length, 2)
assert.match(metadata.rows[0].rowId, /^row_[a-f0-9]{64}$/)
assert.match(metadata.rows[0].paymentReference, /^payref_[a-f0-9]{64}$/)
assert.notEqual(metadata.rows[0].paymentReference, 'order_1')
assert.notEqual(metadata.rows[0].paymentReference, metadata.rows[1].paymentReference)

const workbook = createInvoiceMetadataXlsx(input)
assert(workbook.length > 100, 'metadata workbook must be non-empty')
const workbookText = workbook.toString('utf8')
assert(workbookText.includes('xl/worksheets/sheet1.xml'), 'workbook must have a visible metadata sheet')
assert(!workbookText.includes('vbaProject.bin'), 'workbook must not contain macros')
assert(!workbookText.includes('externalLinks'), 'workbook must not contain external links')
assert(!workbookText.includes('<f'), 'workbook must not contain formulas')
assert(!workbookText.includes('state="hidden"'), 'workbook must not contain hidden sheets')

assert.throws(() => buildInvoiceXlsxMetadata({ ...input, rows: [{ rowNumber: 0, paymentOrderIdSnapshot: 'order_1' }] }), /metadata_invalid/)
assert.throws(() => buildInvoiceXlsxMetadata({ ...input, rows: [{ rowNumber: 1, paymentOrderIdSnapshot: 'order_1' }, { rowNumber: 1, paymentOrderIdSnapshot: 'order_2' }] }), /metadata_invalid/)
assert.throws(() => buildInvoiceXlsxMetadata({ ...input, rows: [{ rowNumber: 1, paymentOrderIdSnapshot: 'order_1\n=HYPERLINK("https://evil.example")' }] }), /metadata_invalid/)

console.log('invoice-xlsx-metadata.test: PASS (INV/F-X-03-01)')
