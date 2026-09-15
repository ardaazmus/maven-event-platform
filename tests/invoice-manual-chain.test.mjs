import assert from 'node:assert/strict'
import { applyInvoiceImport } from '../src/lib/invoice-import-apply.ts'
import { selectInvoiceBatchByFilter } from '../src/lib/invoice-batch-selection.ts'
import { selectInvoiceCandidates } from '../src/lib/invoice-candidates.ts'
import { buildInvoiceDocumentReadyTransition } from '../src/lib/invoice-document-ready-transition.ts'
import { buildInvoiceReadyDelivery } from '../src/lib/invoice-delivery-enqueue.ts'

const orders = [
  { id: 'payment-1', workspaceId: 'workspace-1', formId: 'form-1', submissionId: 'submission-1', publishedVersionId: 'version-1', provider: 'stripe', status: 'succeeded', paymentStatus: 'paid', createdAt: '2026-09-06T07:00:00.000Z', amountMinor: 2500, currency: 'TRY', invoiceRecordId: null },
  { id: 'payment-processing', workspaceId: 'workspace-1', formId: 'form-1', submissionId: 'submission-2', publishedVersionId: 'version-1', provider: 'stripe', status: 'processing', paymentStatus: null, createdAt: '2026-09-06T07:01:00.000Z', amountMinor: 2500, currency: 'TRY', invoiceRecordId: null },
  { id: 'payment-refunded', workspaceId: 'workspace-1', formId: 'form-1', submissionId: 'submission-3', publishedVersionId: 'version-1', provider: 'stripe', status: 'succeeded', paymentStatus: 'refunded', createdAt: '2026-09-06T07:02:00.000Z', amountMinor: 2500, currency: 'TRY', invoiceRecordId: null },
]

const candidates = selectInvoiceCandidates(orders, 'workspace-1')
assert.deepEqual(candidates.map(candidate => candidate.id), ['payment-1'])

const selected = selectInvoiceBatchByFilter({ candidates, workspaceId: 'workspace-1', filter: { formIds: ['form-1'], statuses: ['succeeded'] } })
assert.deepEqual(selected, {
  ok: true,
  filterSnapshot: { formIds: ['form-1'], currencies: [], statuses: ['succeeded'], createdFrom: null, createdTo: null },
  rows: [{ rowNumber: 1, paymentOrderIdSnapshot: 'payment-1' }],
  totalCount: 1,
  totalAmountMinor: 2500,
})

const journal = new Map()
const db = {
  async $transaction(callback) {
    return callback({
      invoiceImportApplication: {
        async findUnique({ where }) { return journal.get(`${where.workspaceId_idempotencyKey.workspaceId}:${where.workspaceId_idempotencyKey.idempotencyKey}`) ?? null },
        async create({ data }) {
          const id = `application-${journal.size + 1}`
          journal.set(`${data.workspaceId}:${data.idempotencyKey}`, { id, status: data.status, candidateId: data.candidateId })
          return { id }
        },
      },
    })
  },
}

const preview = {
  canApply: true,
  counts: { new: 1, update: 0, duplicate: 0, unmatched: 0, invalid: 0, conflict: 0 },
  rows: [{ rowNumber: 1, status: 'new', candidateId: 'payment-1', strategy: 'payment_reference' }],
}
let invoiceCreates = 0
const firstImport = await applyInvoiceImport({ workspaceId: 'workspace-1', batchId: 'batch-1', approvedById: 'accounting-1', preview }, db, async () => {
  invoiceCreates += 1
  return { invoiceRecordId: 'invoice-1' }
})
const replayImport = await applyInvoiceImport({ workspaceId: 'workspace-1', batchId: 'batch-1', approvedById: 'accounting-1', preview }, db, async () => {
  invoiceCreates += 1
  return { invoiceRecordId: 'must-not-create' }
})
assert.deepEqual(firstImport, { status: 'applied', rows: [{ rowNumber: 1, status: 'applied', candidateId: 'payment-1' }] })
assert.deepEqual(replayImport, { status: 'applied', rows: [{ rowNumber: 1, status: 'duplicate', candidateId: 'payment-1' }] })
assert.equal(invoiceCreates, 1)

const ready = buildInvoiceDocumentReadyTransition({
  match: { status: 'matched', strategy: 'payment_reference', candidateId: 'invoice-1' },
  approvalStatus: 'approved',
  invoiceRecordId: 'invoice-1',
  matchedInvoiceRecordId: 'invoice-1',
  invoiceState: 'issued',
  scanStatus: 'clean',
  documentState: 'quarantined',
})
assert.deepEqual(ready, { status: 'ready', invoiceState: 'document_ready', documentState: 'quarantined', readyAtRequired: true })

const deliveryInput = {
  workspaceId: 'workspace-1', formId: 'form-1', submissionId: 'submission-1', invoiceRecordId: 'invoice-1', documentId: 'document-1',
  invoiceState: 'document_ready', documentState: 'quarantined', scanStatus: 'clean', recipientEmail: 'buyer@example.com', formTitle: 'Invoice', documentUrl: 'https://app.example.com/private/document-1', appOrigin: 'https://app.example.com',
}
const delivery = buildInvoiceReadyDelivery(deliveryInput)
assert.deepEqual({ channel: delivery.channel, queueClass: delivery.queueClass, idempotencyKey: delivery.idempotencyKey }, { channel: 'email', queueClass: 'transactional', idempotencyKey: 'invoice:invoice-1:document:document-1:email:v1' })
assert.throws(() => buildInvoiceReadyDelivery({ ...deliveryInput, invoiceState: 'issued' }), /document_ready required/)

console.log('invoice-manual-chain.test: PASS (R-05)')
