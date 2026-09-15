import assert from 'node:assert/strict'
import { matchInvoiceImportRow } from '../src/lib/invoice-matching.ts'
import { previewInvoiceImport } from '../src/lib/invoice-import-preview.ts'

const candidates = [
  { id: 'invoice_new', workspaceId: 'workspace_1', formId: 'form_1', paymentReference: 'payref_new' },
  { id: 'invoice_existing', workspaceId: 'workspace_1', formId: 'form_1', rowId: 'row_existing', paymentReference: 'payref_existing' },
  { id: 'invoice_duplicate', workspaceId: 'workspace_1', formId: 'form_1', paymentReference: 'payref_duplicate' },
]

const source = [
  { rowNumber: 2, validationStatus: 'valid', sourceFingerprint: 'hash-new', row: { paymentReference: 'payref_new' } },
  { rowNumber: 3, validationStatus: 'valid', sourceFingerprint: 'hash-update', row: { paymentReference: 'payref_existing' } },
  { rowNumber: 4, validationStatus: 'valid', sourceFingerprint: 'hash-same', row: { paymentReference: 'payref_duplicate' } },
  { rowNumber: 5, validationStatus: 'valid', sourceFingerprint: 'hash-unmatched', row: { paymentReference: 'payref_missing' } },
  { rowNumber: 6, validationStatus: 'invalid', sourceFingerprint: 'hash-invalid', row: { paymentReference: 'payref_new' } },
  { rowNumber: 7, validationStatus: 'valid', sourceFingerprint: 'hash-conflict', row: { rowId: 'row_existing', paymentReference: 'payref_new' } },
]

const preview = previewInvoiceImport({
  workspaceId: 'workspace_1',
  formId: 'form_1',
  rows: source.map(item => ({
    ...item,
    match: matchInvoiceImportRow({ ...item.row, workspaceId: 'workspace_1', formId: 'form_1' }, candidates),
  })),
  existingByCandidateId: {
    invoice_existing: { sourceFingerprint: 'hash-old' },
    invoice_duplicate: { sourceFingerprint: 'hash-same' },
  },
})

assert.deepEqual(preview, {
  canApply: false,
  counts: { new: 1, update: 1, duplicate: 1, unmatched: 1, invalid: 1, conflict: 1 },
  rows: [
    { rowNumber: 2, status: 'new', candidateId: 'invoice_new', strategy: 'payment_reference' },
    { rowNumber: 3, status: 'update', candidateId: 'invoice_existing', strategy: 'payment_reference' },
    { rowNumber: 4, status: 'duplicate', candidateId: 'invoice_duplicate', strategy: 'payment_reference' },
    { rowNumber: 5, status: 'unmatched', reason: 'no_candidate' },
    { rowNumber: 6, status: 'invalid', reason: 'validation_invalid' },
    { rowNumber: 7, status: 'conflict', reason: 'multiple_references_conflict' },
  ],
})

const inputSnapshot = JSON.stringify(source)
previewInvoiceImport({
  workspaceId: 'workspace_1',
  formId: 'form_1',
    rows: source.slice(0, 1).map(item => ({ ...item, match: matchInvoiceImportRow({ ...item.row, workspaceId: 'workspace_1', formId: 'form_1' }, candidates) })),
  existingByCandidateId: {},
})
assert.equal(JSON.stringify(source), inputSnapshot, 'dry-run must not mutate imported rows')

const conflictPreview = previewInvoiceImport({
  workspaceId: 'workspace_1',
  formId: 'form_1',
  rows: [{
    rowNumber: 2,
    validationStatus: 'valid',
    sourceFingerprint: 'hash-conflict',
    row: { rowId: 'row_a', paymentReference: 'payref_b' },
    match: { status: 'conflict', reason: 'multiple_references_conflict' },
  }],
  existingByCandidateId: {},
})
assert.deepEqual(conflictPreview.rows[0], { rowNumber: 2, status: 'conflict', reason: 'multiple_references_conflict' })

console.log('invoice-import-preview.test: PASS (INV/F-I-04-01)')
