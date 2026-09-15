import assert from 'node:assert/strict'
import { enqueuePersistedInvoiceReadyDelivery } from '../src/lib/invoice-document-ready-delivery.ts'

const base = {
  workspaceId: 'workspace-1', formId: 'stale-form', submissionId: 'submission-1', invoiceRecordId: 'invoice-1', documentId: 'document-1',
  invoiceState: 'issued', documentState: 'quarantined', scanStatus: 'pending', recipientEmail: 'buyer@example.com', formTitle: 'Invoice', documentUrl: 'https://app.example.com/doc', appOrigin: 'https://app.example.com',
}

function readClient({ state = 'document_ready', readyAt = new Date(), scanStatus = 'clean', document = true } = {}) {
  const calls = []
  return {
    calls,
    invoiceDocument: { async findFirst(query) { calls.push(query); return document ? { id: 'document-1', state: 'quarantined', scanStatus, readyAt, invoiceRecord: { state, paymentOrder: { formId: 'form-1', submissionId: 'submission-1' } } } : null } },
  }
}

const read = readClient()
let delegated
const queued = await enqueuePersistedInvoiceReadyDelivery(base, read, async input => { delegated = input; return { status: 'queued', deliveryIntentId: 'intent-1', outboxEventId: 'outbox-1', idempotencyKey: 'key-1' } })
assert.deepEqual(queued, { status: 'queued', deliveryIntentId: 'intent-1', outboxEventId: 'outbox-1', idempotencyKey: 'key-1' })
assert.deepEqual({ formId: delegated.formId, invoiceState: delegated.invoiceState, scanStatus: delegated.scanStatus }, { formId: 'form-1', invoiceState: 'document_ready', scanStatus: 'clean' })
assert.equal(read.calls[0].where.readyAt.not, null)

let called = false
assert.deepEqual(await enqueuePersistedInvoiceReadyDelivery(base, readClient({ state: 'issued' }), async () => { called = true; throw new Error('must not enqueue') }), { status: 'blocked', reason: 'document_not_ready' })
assert.equal(called, false)
assert.deepEqual(await enqueuePersistedInvoiceReadyDelivery(base, readClient({ document: false }), async () => { throw new Error('must not enqueue') }), { status: 'blocked', reason: 'document_not_ready' })

console.log('invoice-document-ready-delivery.test: PASS (P-12C-03)')
