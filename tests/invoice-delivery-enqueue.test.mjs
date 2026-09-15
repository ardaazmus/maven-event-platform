import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildInvoiceReadyDelivery } from '../src/lib/invoice-delivery-enqueue.ts'

const source = readFileSync('src/lib/invoice-delivery-enqueue.ts', 'utf8')
assert(source.includes('document_ready'), 'enqueue must require document-ready state')
assert(source.includes('invoiceDeliveryIntent'), 'enqueue must persist a delivery intent')
assert(source.includes('outboxEvent'), 'enqueue must persist an outbox event')
assert(source.includes('$transaction'), 'enqueue must use one database transaction')
assert(source.includes('invoiceRecordId_channel_idempotencyKey'), 'enqueue must use the durable intent idempotency key')

const input = {
  workspaceId: 'workspace_1',
  formId: 'form_1',
  submissionId: 'submission_1',
  invoiceRecordId: 'invoice_1',
  documentId: 'document_1',
  invoiceState: 'document_ready',
  documentState: 'quarantined',
  scanStatus: 'clean',
  recipientEmail: '  Person@Example.com ',
  formTitle: 'Etkinlik <2026>',
  invoiceNumber: 'INV-001',
  documentUrl: 'https://app.example.com/invoices/documents/document_1',
  appOrigin: 'https://app.example.com',
}

const first = buildInvoiceReadyDelivery(input)
assert.equal(first.status, 'ready')
assert.equal(first.channel, 'email')
assert.equal(first.queueClass, 'transactional')
assert.equal(first.idempotencyKey, 'invoice:invoice_1:document:document_1:email:v1')
assert.equal(first.outbox.workspaceId, 'workspace_1')
assert.equal(first.outbox.formId, 'form_1')
assert.equal(first.outbox.submissionId, 'submission_1')
assert.equal(first.outbox.type, 'email')
assert.equal(first.outbox.payload.recipientEmail, 'person@example.com')
assert(first.outbox.payload.html.includes('Etkinlik &lt;2026&gt;'))
assert(!JSON.stringify(first.outbox.payload).includes('providerUrl'))
assert(!JSON.stringify(first.outbox.payload).includes('provider_secret'))

const second = buildInvoiceReadyDelivery(input)
assert.deepEqual(second, first, 'same invoice document must produce the same enqueue command')

assert.throws(() => buildInvoiceReadyDelivery({ ...input, invoiceState: 'issued' }), /document_ready required/)
assert.throws(() => buildInvoiceReadyDelivery({ ...input, scanStatus: 'pending' }), /clean scan required/)
assert.throws(() => buildInvoiceReadyDelivery({ ...input, documentState: 'published' }), /private quarantine required/)
assert.throws(() => buildInvoiceReadyDelivery({ ...input, recipientEmail: '' }), /recipient email required/)
assert.throws(() => buildInvoiceReadyDelivery({ ...input, submissionId: '' }), /submission id required/)

console.log('invoice-delivery-enqueue.test: PASS (INV/F-E-01-01)')
