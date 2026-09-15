import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { classifyEmailEvent } from '../src/lib/email-policy.ts'
import { normalizeSenderProfile } from '../src/lib/email-sender-profile.ts'
import { buildTransactionalEmail } from '../src/lib/email-template-policy.ts'
import { buildInvoiceReadyDelivery } from '../src/lib/invoice-delivery-enqueue.ts'
import { evaluateInvoiceEmailGate } from '../src/lib/invoice-delivery-gate.ts'

const source = relativePath => readFileSync(relativePath, 'utf8')
const publicSubmissionRoute = source('src/app/api/public/forms/[slug]/submissions/route.ts')
const invoiceEnqueue = source('src/lib/invoice-delivery-enqueue.ts')
const invoiceEmail = source('src/lib/invoice-email.ts')

assert.equal(classifyEmailEvent('invoice_ready'), 'transactional')
assert.equal(classifyEmailEvent('form_confirmation'), 'notification')
assert(publicSubmissionRoute.includes("emailMessageClass: 'notification'"), 'form kayıt bildirimi notification kanalında kalmalı')
assert(invoiceEmail.includes("messageClass: 'transactional'"), 'fatura maili transactional kanalında kalmalı')
assert(invoiceEnqueue.includes('invoiceDeliveryIntent') && invoiceEnqueue.includes('idempotencyKey'), 'fatura teslimatı kalıcı intent ve idempotency kullanmalı')
assert(invoiceEnqueue.includes("visibility: 'private'") && invoiceEnqueue.includes("state: 'quarantined'") && invoiceEnqueue.includes("scanStatus: 'clean'"), 'delivery enqueue must recheck the private clean document scope')

const base = {
  workspaceId: 'workspace-1',
  formId: 'form-1',
  submissionId: 'submission-1',
  invoiceRecordId: 'invoice-1',
  documentId: 'document-1',
  invoiceState: 'document_ready',
  documentState: 'quarantined',
  scanStatus: 'clean',
  recipientEmail: 'buyer@example.com',
  formTitle: 'Etkinlik kaydı',
  invoiceNumber: 'INV-001',
  documentUrl: 'https://app.example.com/api/invoices/invoice-1/documents/document-1',
  appOrigin: 'https://app.example.com',
}

const first = buildInvoiceReadyDelivery(base)
const replay = buildInvoiceReadyDelivery(base)
assert.equal(first.queueClass, 'transactional')
assert.equal(first.outbox.queueClass, 'transactional')
assert.equal(first.outbox.payload.documentUrl, base.documentUrl)
assert.equal(first.outbox.payload.recipientEmail, base.recipientEmail)
assert.equal(first.idempotencyKey, 'invoice:invoice-1:document:document-1:email:v1')
assert.equal(replay.idempotencyKey, first.idempotencyKey)
assert(!JSON.stringify(first).includes('providerSecret'), 'fatura komutu provider secret taşımamalı')
assert.throws(() => buildInvoiceReadyDelivery({ ...base, invoiceState: 'issued' }), /document_ready required/)
assert.throws(() => buildInvoiceReadyDelivery({ ...base, documentState: 'published' }), /private quarantine required/)
assert.throws(() => buildInvoiceReadyDelivery({ ...base, scanStatus: 'pending' }), /clean scan required/)

const emailPhases = { 'E-00': 'pass', 'E-01': 'pass', 'E-02': 'pass', 'E-03': 'pass' }
const documentPhases = { 'U-00': 'pass', 'U-01': 'pass', 'U-02': 'pass', 'U-03': 'pass', 'U-04': 'pass' }
const gate = {
  emailPhaseStatuses: emailPhases,
  documentPhaseStatuses: documentPhases,
  documentReadyAllowed: true,
  messageClass: 'transactional',
  recipientPresent: true,
  suppressed: false,
  deliveryIntentStatus: 'queued',
  outboxStatus: 'queued',
}
assert.deepEqual(evaluateInvoiceEmailGate({ ...gate, documentReadyAllowed: false }), { enabled: false, canDeliver: false, reason: 'document_not_ready' })
assert.deepEqual(evaluateInvoiceEmailGate(gate), { enabled: true, canDeliver: true })
assert.deepEqual(evaluateInvoiceEmailGate({ ...gate, messageClass: 'notification' }), { enabled: false, canDeliver: false, reason: 'message_class_invalid' })

const billingProfile = normalizeSenderProfile({ workspaceId: 'workspace-1', messageClass: 'transactional', provider: 'mailchimp_transactional', sendingDomain: 'billing.example.com', fromAddress: 'Billing <billing@billing.example.com>' })
const formProfile = normalizeSenderProfile({ workspaceId: 'workspace-1', messageClass: 'notification', provider: 'mailchimp_transactional', sendingDomain: 'notify.example.com', fromAddress: 'Forms <forms@notify.example.com>' })
assert.equal(billingProfile.messageClass, 'transactional')
assert.equal(formProfile.messageClass, 'notification')
assert.notEqual(billingProfile.fromAddress, formProfile.fromAddress)
assert.equal(billingProfile.enabled, false)

const email = buildTransactionalEmail({ messageClass: 'transactional', subject: 'Faturanız hazır', textBody: 'Belgeniz hazır.', appOrigin: base.appOrigin, documentUrl: base.documentUrl })
assert(email.html.includes('Belgeyi görüntüle'))
assert.throws(() => buildTransactionalEmail({ messageClass: 'transactional', subject: 'Fatura', textBody: 'Belge', appOrigin: base.appOrigin, documentUrl: 'https://external.example/invoice' }), /document URL must belong to the app origin/)
assert.throws(() => buildTransactionalEmail({ messageClass: 'transactional', subject: 'Fatura', textBody: 'Belge', appOrigin: base.appOrigin, providerUrl: 'https://provider.example/invoice' }), /raw provider URL is not allowed/)

console.log('v2-invoice-delivery-manual.test: PASS (V2-08)')
