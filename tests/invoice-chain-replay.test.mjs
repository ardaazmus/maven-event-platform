import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { enqueuePersistedInvoiceReadyDelivery } from '../src/lib/invoice-document-ready-delivery.ts'
import { buildInvoiceReadyDelivery } from '../src/lib/invoice-delivery-enqueue.ts'

const handoffSource = readFileSync('src/lib/payment-invoice-webhook-handoff.ts', 'utf8')
assert(handoffSource.includes("order.status !== 'succeeded'"), 'invoice handoff must require succeeded payment')
assert(handoffSource.includes('persistPaymentInvoiceSnapshot'), 'payment handoff must persist invoice snapshot')

const base = {
  workspaceId: 'workspace-1', formId: 'stale-form', submissionId: 'stale-submission', invoiceRecordId: 'invoice-1', documentId: 'document-1',
  invoiceState: 'issued', documentState: 'quarantined', scanStatus: 'pending', recipientEmail: 'buyer@example.com', formTitle: 'Invoice', documentUrl: 'https://app.example.com/doc', appOrigin: 'https://app.example.com',
}

function readClient({ ready = true, workspaceId = 'workspace-1' } = {}) {
  const calls = []
  return {
    calls,
    invoiceDocument: { async findFirst(query) {
      calls.push(query)
      return ready && query.where.invoiceRecord.workspaceId === workspaceId ? { id: 'document-1', state: 'quarantined', scanStatus: 'clean', readyAt: new Date(), invoiceRecord: { state: 'document_ready', paymentOrder: { formId: 'form-1', submissionId: 'submission-1' } } } : null
    } },
  }
}

const sent = new Set()
let enqueueCalls = 0
async function replaySafeEnqueue(input) {
  const command = buildInvoiceReadyDelivery(input)
  enqueueCalls += 1
  if (sent.has(command.idempotencyKey)) return { status: 'duplicate', deliveryIntentId: 'intent-1', idempotencyKey: command.idempotencyKey }
  sent.add(command.idempotencyKey)
  return { status: 'queued', deliveryIntentId: 'intent-1', outboxEventId: 'outbox-1', idempotencyKey: command.idempotencyKey }
}

const client = readClient()
assert.deepEqual(await enqueuePersistedInvoiceReadyDelivery(base, client, replaySafeEnqueue), { status: 'queued', deliveryIntentId: 'intent-1', outboxEventId: 'outbox-1', idempotencyKey: 'invoice:invoice-1:document:document-1:email:v1' })
assert.deepEqual(await enqueuePersistedInvoiceReadyDelivery(base, client, replaySafeEnqueue), { status: 'duplicate', deliveryIntentId: 'intent-1', idempotencyKey: 'invoice:invoice-1:document:document-1:email:v1' })
assert.equal(enqueueCalls, 2)
assert.deepEqual(await enqueuePersistedInvoiceReadyDelivery(base, readClient({ ready: false }), async () => { throw new Error('must not enqueue') }), { status: 'blocked', reason: 'document_not_ready' })
assert.deepEqual(await enqueuePersistedInvoiceReadyDelivery(base, readClient({ workspaceId: 'workspace-2' }), async () => { throw new Error('must not enqueue') }), { status: 'blocked', reason: 'document_not_ready' })

console.log('invoice-chain-replay.test: PASS (P-12D-01)')
