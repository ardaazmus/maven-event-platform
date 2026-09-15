import assert from 'node:assert/strict'
import { listInvoiceCenter, toInvoiceCenterItem } from '../src/lib/invoice-center-read-model.ts'
import { readFileSync } from 'node:fs'

const dates = { createdAt: new Date('2026-09-06T00:00:00.000Z'), updatedAt: new Date('2026-09-06T00:00:00.000Z') }
const record = {
  id: 'invoice-1', provider: 'manual', documentType: 'e_archive', amountMinor: 1250, currency: 'TRY', state: 'document_ready', providerInvoiceId: null, invoiceNumber: 'INV-1', invoiceUuid: null, ...dates,
  paymentOrder: {
    id: 'payment-1', formId: 'form-1', provider: 'stripe', mode: 'test', status: 'succeeded', amountMinor: 1250, currency: 'TRY',
    form: { id: 'form-1', title: 'Etkinlik', slug: 'etkinlik', status: 'published', publishedVersionId: 'version-1' },
    submission: { id: 'submission-1', status: 'approved', source: 'web', submittedAt: dates.createdAt },
  },
  documents: [{ id: 'document-1', artifactKind: 'invoice_pdf', state: 'ready', scanStatus: 'clean', visibility: 'private', readyAt: dates.createdAt, createdAt: dates.createdAt }],
  deliveries: [{ id: 'delivery-1', documentId: 'document-1', channel: 'email', status: 'queued', provider: null, attemptCount: 0, sentAt: null, createdAt: dates.createdAt }],
}
const item = toInvoiceCenterItem(record)
assert.equal(item.form.title, 'Etkinlik')
assert.equal(item.payment.status, 'succeeded')
assert.equal(item.invoice.state, 'document_ready')
assert.equal(item.documents[0].visibility, 'private')
assert.equal(item.deliveries[0].status, 'queued')
assert.equal('recipientSnapshot' in item, false)
assert.equal('rawPayload' in item, false)

const calls = []
const result = await listInvoiceCenter({
  db: { invoiceRecord: { findMany: async args => { calls.push(args); return [record, { ...record, id: 'invoice-2' }] } } },
  workspaceId: 'workspace-1', limit: 1, query: 'Etkinlik', formId: 'form-1', state: 'document_ready', cursor: 'invoice-0',
})
assert.equal(result.data.length, 1)
assert.equal(result.nextCursor, 'invoice-1')
assert.equal(calls[0].take, 2)
assert.equal(calls[0].where.workspaceId, 'workspace-1')
assert.equal(calls[0].where.paymentOrder.workspaceId, 'workspace-1')
assert.equal(calls[0].where.paymentOrder.formId, 'form-1')
assert.equal(calls[0].cursor.id, 'invoice-0')

const route = readFileSync('src/app/api/invoices/center/route.ts', 'utf8')
assert(route.includes('can.readInvoices'), 'invoice center must use invoice authorization')
assert(route.includes('Cache-Control'), 'invoice center must be private and non-cacheable')
assert(!route.includes('public'), 'invoice center must not be a public route')

console.log('invoice-center-read-model.test: PASS (R-02)')
