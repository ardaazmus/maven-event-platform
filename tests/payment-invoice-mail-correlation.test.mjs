import assert from 'node:assert/strict'
import { evaluatePaymentInvoiceMailChain } from '../src/lib/payment-invoice-mail-correlation.ts'

const scope = { workspaceId: 'workspace-1', formId: 'form-1', submissionId: 'submission-1' }
const payment = { orderId: 'payment-order-1', status: 'succeeded', scope }
const invoice = { id: 'invoice-1', paymentOrderId: 'payment-order-1', state: 'issued', scope }
const document = { id: 'document-1', invoiceRecordId: 'invoice-1', state: 'quarantined', scanStatus: 'clean', readyAtMs: 10_000, scope }
const delivery = { id: 'delivery-1', invoiceRecordId: 'invoice-1', documentId: 'document-1', status: 'queued', outboxStatus: 'queued', scope, idempotencyKey: 'invoice:invoice-1:document:document-1:email:v1' }

assert.deepEqual(evaluatePaymentInvoiceMailChain({ requestedStage: 'invoice', payment, invoice }), { allowed: true, stage: 'invoice', outcome: 'ready', correlation: { orderId: 'payment-order-1', invoiceId: 'invoice-1', documentId: null, deliveryId: null } })
assert.deepEqual(evaluatePaymentInvoiceMailChain({ requestedStage: 'document_ready', payment, invoice: { ...invoice, state: 'document_ready' }, document }), { allowed: true, stage: 'document_ready', outcome: 'ready', correlation: { orderId: 'payment-order-1', invoiceId: 'invoice-1', documentId: 'document-1', deliveryId: null } })
assert.deepEqual(evaluatePaymentInvoiceMailChain({ requestedStage: 'mail', payment, invoice: { ...invoice, state: 'delivery_queued' }, document, delivery }), { allowed: true, stage: 'mail', outcome: 'ready', correlation: { orderId: 'payment-order-1', invoiceId: 'invoice-1', documentId: 'document-1', deliveryId: 'delivery-1' } })
assert.equal(evaluatePaymentInvoiceMailChain({ requestedStage: 'mail', replay: true, payment, invoice: { ...invoice, state: 'delivery_queued' }, document, delivery }).outcome, 'duplicate')

assert.deepEqual(evaluatePaymentInvoiceMailChain({ requestedStage: 'invoice', payment: { ...payment, status: 'pending' }, invoice }), { allowed: false, reason: 'payment_not_succeeded' })
assert.deepEqual(evaluatePaymentInvoiceMailChain({ requestedStage: 'invoice', payment, invoice: { ...invoice, paymentOrderId: 'other-payment' } }), { allowed: false, reason: 'invoice_scope_mismatch' })
assert.deepEqual(evaluatePaymentInvoiceMailChain({ requestedStage: 'document_ready', payment, invoice, document }), { allowed: false, reason: 'document_not_ready' })
assert.deepEqual(evaluatePaymentInvoiceMailChain({ requestedStage: 'document_ready', payment, invoice: { ...invoice, state: 'document_ready' }, document: { ...document, scope: { ...scope, workspaceId: 'other-workspace' } } }), { allowed: false, reason: 'document_scope_mismatch' })
assert.deepEqual(evaluatePaymentInvoiceMailChain({ requestedStage: 'mail', payment, invoice: { ...invoice, state: 'delivery_queued' }, document, delivery: { ...delivery, idempotencyKey: '' } }), { allowed: false, reason: 'delivery_evidence_missing' })

console.log('payment-invoice-mail-correlation.test: PASS (R10-V4-36)')
