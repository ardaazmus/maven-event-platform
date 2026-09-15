import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildInvoiceResendDelivery } from '../src/lib/invoice-delivery-resend.ts'

const source = readFileSync('src/lib/invoice-delivery-resend.ts', 'utf8')
assert(source.includes('db.$transaction'), 'resend must use one database transaction')
assert(source.includes('emailSuppression'), 'resend must check durable suppression state')
assert(source.includes('auditLog.create'), 'resend must be audited')
assert(source.includes('invoiceDeliveryIntent'), 'resend must use the invoice delivery intent')

const input = {
  workspaceId: 'workspace_1',
  formId: 'form_1',
  submissionId: 'submission_1',
  invoiceRecordId: 'invoice_1',
  documentId: 'document_1',
  invoiceState: 'sent',
  documentState: 'quarantined',
  documentReadyState: 'verified',
  scanStatus: 'clean',
  recipientEmail: 'person@example.com',
  formTitle: 'Etkinlik <2026>',
  invoiceNumber: 'INV-001',
  documentUrl: 'https://app.example.com/invoices/documents/document_1',
  appOrigin: 'https://app.example.com',
  authorizedById: 'user_1',
  resendKey: 'manual-20260904',
  hasPriorDelivery: true,
  suppressed: false,
}

assert.deepEqual(buildInvoiceResendDelivery({ ...input, confirmation: '' }), {
  status: 'duplicate_warning', reason: 'prior_delivery_exists',
})

const ready = buildInvoiceResendDelivery({ ...input, confirmation: 'RESEND' })
assert.equal(ready.status, 'ready')
assert.equal(ready.idempotencyKey, 'invoice:invoice_1:document:document_1:email:resend:manual-20260904')
assert.equal(ready.outbox.queueClass, 'transactional')
assert.equal(ready.outbox.payload.recipientEmail, 'person@example.com')
assert(ready.outbox.payload.html.includes('Etkinlik &lt;2026&gt;'))
assert(!JSON.stringify(ready.outbox.payload).includes('provider_secret'))

assert.deepEqual(buildInvoiceResendDelivery({ ...input, confirmation: 'RESEND', suppressed: true }), {
  status: 'suppressed', reason: 'recipient_suppressed',
})
assert.deepEqual(buildInvoiceResendDelivery({ ...input, confirmation: 'RESEND', hasPriorDelivery: false }), {
  ...ready,
  status: 'ready',
})
assert.throws(() => buildInvoiceResendDelivery({ ...input, authorizedById: '', confirmation: 'RESEND' }), /authorized user required/)
assert.throws(() => buildInvoiceResendDelivery({ ...input, documentReadyState: 'pending', confirmation: 'RESEND' }), /document-ready verification required/)
assert.throws(() => buildInvoiceResendDelivery({ ...input, invoiceState: 'issued', confirmation: 'RESEND' }), /invoice delivery state invalid/)

console.log('invoice-delivery-resend.test: PASS (INV/F-E-03-01)')
