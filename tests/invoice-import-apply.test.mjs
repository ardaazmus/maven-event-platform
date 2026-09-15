import assert from 'node:assert/strict'
import { applyInvoiceImport } from '../src/lib/invoice-import-apply.ts'

const journal = new Map()
const db = {
  async $transaction(callback) {
    return callback({
      invoiceImportApplication: {
        async findUnique({ where }) {
          return journal.get(`${where.workspaceId_idempotencyKey.workspaceId}:${where.workspaceId_idempotencyKey.idempotencyKey}`) ?? null
        },
        async create({ data }) {
          journal.set(`${data.workspaceId}:${data.idempotencyKey}`, { id: `application_${journal.size + 1}`, status: data.status, candidateId: data.candidateId })
          return { id: `application_${journal.size}` }
        },
      },
    })
  },
}

const preview = {
  canApply: true,
  counts: { new: 1, update: 1, duplicate: 1, unmatched: 0, invalid: 0, conflict: 0 },
  rows: [
    { rowNumber: 2, status: 'new', candidateId: 'invoice_new', strategy: 'payment_reference' },
    { rowNumber: 3, status: 'update', candidateId: 'invoice_update', strategy: 'provider_invoice_id' },
    { rowNumber: 4, status: 'duplicate', candidateId: 'invoice_duplicate', strategy: 'invoice_uuid' },
  ],
}

let applyCalls = 0
const first = await applyInvoiceImport({
  workspaceId: 'workspace_1',
  batchId: 'batch_1',
  approvedById: 'accounting_1',
  preview,
}, db, async (_tx, row) => {
  applyCalls += 1
  return { invoiceRecordId: row.candidateId }
})
assert.deepEqual(first, {
  status: 'applied',
  rows: [
    { rowNumber: 2, status: 'applied', candidateId: 'invoice_new' },
    { rowNumber: 3, status: 'applied', candidateId: 'invoice_update' },
    { rowNumber: 4, status: 'duplicate', candidateId: 'invoice_duplicate' },
  ],
})
assert.equal(applyCalls, 2, 'duplicate preview rows must not invoke invoice application')

const replay = await applyInvoiceImport({ workspaceId: 'workspace_1', batchId: 'batch_1', approvedById: 'accounting_1', preview }, db, async () => {
  applyCalls += 1
  return { invoiceRecordId: 'must_not_run' }
})
assert.deepEqual(replay, {
  status: 'applied',
  rows: [
    { rowNumber: 2, status: 'duplicate', candidateId: 'invoice_new' },
    { rowNumber: 3, status: 'duplicate', candidateId: 'invoice_update' },
    { rowNumber: 4, status: 'duplicate', candidateId: 'invoice_duplicate' },
  ],
})
assert.equal(applyCalls, 2, 'same batch replay must not create a new invoice or invoke application again')

const failed = await applyInvoiceImport({
  workspaceId: 'workspace_1',
  batchId: 'batch_2',
  approvedById: 'accounting_1',
  preview: {
    ...preview,
    rows: [preview.rows[0], preview.rows[1]],
    counts: { ...preview.counts, duplicate: 0 },
  },
}, db, async (_tx, row) => {
  if (row.rowNumber === 3) throw new Error('provider_failed')
  return { invoiceRecordId: row.candidateId }
})
assert.deepEqual(failed, {
  status: 'partial',
  rows: [
    { rowNumber: 2, status: 'applied', candidateId: 'invoice_new' },
    { rowNumber: 3, status: 'failed', reason: 'apply_failed' },
  ],
})

let blockedCalls = 0
const blocked = await applyInvoiceImport({
  workspaceId: 'workspace_1',
  batchId: 'batch_3',
  approvedById: 'accounting_1',
  preview: {
    canApply: false,
    counts: { new: 0, update: 0, duplicate: 0, unmatched: 1, invalid: 0, conflict: 0 },
    rows: [{ rowNumber: 2, status: 'unmatched', reason: 'no_candidate' }],
  },
}, db, async () => {
  blockedCalls += 1
  return { invoiceRecordId: 'must_not_run' }
})
assert.deepEqual(blocked, { status: 'blocked', reason: 'preview_not_applyable', rows: [] })
assert.equal(blockedCalls, 0)

console.log('invoice-import-apply.test: PASS (INV/F-I-05-01)')
