import assert from 'node:assert/strict'
import { enqueueInvoiceReadyDelivery } from '../src/lib/invoice-delivery-enqueue.ts'

const input = {
  workspaceId: 'ws-1', formId: 'form-1', submissionId: 'sub-1',
  invoiceRecordId: 'invoice-1', documentId: 'doc-1',
  invoiceState: 'document_ready', documentState: 'quarantined', scanStatus: 'clean',
  recipientEmail: 'person@example.com', formTitle: 'Form',
  appOrigin: 'https://app.example.com', documentUrl: 'https://app.example.com/invoices/documents/doc-1',
}

// In-memory transaction double: the real enqueue function executes every query;
// rollback discards the staged intent/outbox if its final state claim fails.
function matches(row, where) {
  return Object.entries(where).every(([key, expected]) => {
    if (expected && typeof expected === 'object') {
      if ('some' in expected) return row[key]?.some(item => matches(item, expected.some))
      return row[key] != null && matches(row[key], expected)
    }
    return row[key] === expected
  })
}

function fixture({ invoiceState = 'document_ready', scan = 'clean', visibility = 'private', lostClaim = false, outboxFails = false, uniqueRace = false } = {}) {
  const invoice = {
    id: 'invoice-1', workspaceId: 'ws-1', provider: 'parasut', state: invoiceState,
    paymentOrder: {
      workspaceId: 'ws-1', formId: 'form-1', submissionId: 'sub-1',
      form: { workspaceId: 'ws-1' }, submission: { formId: 'form-1' },
    },
  }
  const document = {
    id: 'doc-1', invoiceRecordId: invoice.id, state: 'quarantined',
    visibility, scanStatus: scan, invoiceRecord: invoice,
  }
  const state = { invoice, document, intents: [], outbox: [], commits: 0 }
  const client = {
    invoiceDeliveryIntent: {
      async findFirst({ where }) {
        return state.intents.find(intent => matches({ ...intent, invoiceRecord: invoice, document }, where)) ?? null
      },
    },
    async $transaction(callback) {
      const intents = structuredClone(state.intents)
      const outbox = structuredClone(state.outbox)
      let nextState = invoice.state
      const result = await callback({
        invoiceRecord: {
          async findFirst({ where }) { return matches(invoice, where) ? { state: invoice.state } : null },
          async updateMany({ where, data }) {
            if (lostClaim || !matches({ ...invoice, documents: [document] }, where)) return { count: 0 }
            nextState = data.state
            return { count: 1 }
          },
        },
        invoiceDocument: {
          async findFirst({ where }) { return matches(document, where) ? { id: document.id } : null },
        },
        invoiceDeliveryIntent: {
          async findUnique({ where }) {
            return intents.find(intent => matches(intent, where.invoiceRecordId_channel_idempotencyKey)) ?? null
          },
          async create({ data }) {
            const intent = { id: 'intent-1', ...data }
            if (uniqueRace) {
              state.intents.push(intent)
              invoice.state = 'delivery_queued'
              throw Object.assign(new Error('unique conflict'), { code: 'P2002' })
            }
            intents.push(intent)
            return intent
          },
          async update({ where, data }) { Object.assign(intents.find(intent => intent.id === where.id), data) },
        },
        outboxEvent: {
          async create({ data }) {
            if (outboxFails) throw new Error('outbox unavailable')
            const event = { id: 'outbox-1', ...data }
            outbox.push(event)
            return event
          },
        },
      })
      state.intents = intents
      state.outbox = outbox
      invoice.state = nextState
      state.commits += 1
      return result
    },
  }
  return { client, state }
}

const normal = fixture()
assert.deepEqual(await enqueueInvoiceReadyDelivery(input, normal.client), {
  status: 'queued', deliveryIntentId: 'intent-1', outboxEventId: 'outbox-1',
  idempotencyKey: 'invoice:invoice-1:document:doc-1:email:v1',
})
assert.equal(normal.state.invoice.state, 'delivery_queued')
assert.equal(normal.state.intents[0].outboxEventId, normal.state.outbox[0].id)
assert.equal(normal.state.outbox[0].queueClass, 'transactional')
assert.equal((await enqueueInvoiceReadyDelivery(input, normal.client)).status, 'duplicate')
assert.equal(normal.state.intents.length, 1)
assert.equal(normal.state.outbox.length, 1)

for (const field of ['workspaceId', 'formId', 'submissionId', 'invoiceRecordId', 'documentId']) {
  const other = fixture()
  await assert.rejects(enqueueInvoiceReadyDelivery({ ...input, [field]: 'other' }, other.client), /scope mismatch|not eligible/)
  assert.deepEqual([other.state.intents.length, other.state.outbox.length, other.state.commits], [0, 0, 0])
}
for (const options of [{ scan: 'pending' }, { scan: 'infected' }, { visibility: 'public' }, { invoiceState: 'issued' }]) {
  const unsafe = fixture(options)
  // The caller still claims clean/document_ready; durable state must win.
  await assert.rejects(enqueueInvoiceReadyDelivery(input, unsafe.client), /not eligible|not document_ready/)
  assert.equal(unsafe.state.commits, 0)
}
const unrelatedDocument = fixture()
unrelatedDocument.state.document.invoiceRecordId = 'different-invoice'
await assert.rejects(enqueueInvoiceReadyDelivery(input, unrelatedDocument.client), /not eligible/)

for (const options of [{ lostClaim: true }, { outboxFails: true }]) {
  const failure = fixture(options)
  await assert.rejects(enqueueInvoiceReadyDelivery(input, failure.client), /state changed|outbox unavailable/)
  assert.deepEqual([failure.state.invoice.state, failure.state.intents, failure.state.outbox], ['document_ready', [], []])
}
const race = fixture({ uniqueRace: true })
assert.equal((await enqueueInvoiceReadyDelivery(input, race.client)).status, 'duplicate')
assert.equal(race.state.outbox.length, 0, 'losing transaction must not add another outbox event')
console.log('invoice-delivery-persistence: PASS (P-12A scoped durable enqueue)')
