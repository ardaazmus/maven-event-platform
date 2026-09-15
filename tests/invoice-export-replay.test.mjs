import assert from 'node:assert/strict'
import {
  buildInvoiceXlsxMetadata,
  createInvoiceInterchangeXlsx,
  INVOICE_XLSX_COLUMNS,
  mapInvoiceInterchangeRow,
} from '../src/lib/invoice-xlsx-export.ts'

const input = {
  workspaceId: 'workspace_1',
  batchId: 'batch_1',
  rows: [
    { rowNumber: 1, paymentOrderIdSnapshot: 'po_1' },
    { rowNumber: 2, paymentOrderIdSnapshot: 'po_2' },
  ],
}

const firstMetadata = buildInvoiceXlsxMetadata(input)
const secondMetadata = buildInvoiceXlsxMetadata(input)
assert.deepEqual(secondMetadata, firstMetadata, 'same batch snapshot must produce stable metadata and references')

const makeRow = (index) => mapInvoiceInterchangeRow({
  formatVersion: firstMetadata.formatVersion,
  batchId: firstMetadata.batchId,
  rowId: firstMetadata.rows[index].rowId,
  paymentReference: firstMetadata.rows[index].paymentReference,
  invoice: {
    provider: 'manual',
    documentType: 'e_archive',
    amountMinor: 12500 + index,
    currency: 'TRY',
    taxAmountMinor: 2083,
    taxRateBps: 2000,
    recipient: { recipientType: 'individual', legalName: `Replay ${index}`, countryCode: 'TR' },
  },
})

const firstRows = [makeRow(0), makeRow(1)]
const secondRows = [makeRow(0), makeRow(1)]
const firstWorkbook = createInvoiceInterchangeXlsx(firstRows)
const secondWorkbook = createInvoiceInterchangeXlsx(secondRows)
assert.deepEqual([...secondWorkbook], [...firstWorkbook], 'same batch replay must produce identical XLSX bytes')
assert.equal(firstRows[0].length, INVOICE_XLSX_COLUMNS.length, 'replay rows must use the fixed interchange columns')

assert.throws(
  () => createInvoiceInterchangeXlsx([firstRows[0].slice(0, -1)]),
  /invoice_workbook_invalid/,
  'replay must reject rows that do not match the fixed schema',
)

console.log('invoice-export-replay.test: PASS (INV/F-X-06-01)')
