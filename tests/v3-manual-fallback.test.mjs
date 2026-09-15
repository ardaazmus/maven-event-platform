import assert from 'node:assert/strict'
import { buildInvoiceReadyDelivery } from '../src/lib/invoice-delivery-enqueue.ts'
import { buildInvoiceIdempotencyKey } from '../src/lib/invoice-idempotency.ts'
import { matchInvoiceImportRow } from '../src/lib/invoice-matching.ts'
import { evaluateInvoiceTransition } from '../src/lib/invoice-state.ts'

assert.deepEqual(evaluateInvoiceTransition('reconciliation_required', 'accounting_review_required'), { accepted: true, changed: true, status: 'accounting_review_required' })
assert.deepEqual(evaluateInvoiceTransition('accounting_review_required', 'queued'), { accepted: true, changed: true, status: 'queued' })
assert.deepEqual(evaluateInvoiceTransition('formalization_error', 'accounting_review_required'), { accepted: true, changed: true, status: 'accounting_review_required' })
assert.deepEqual(evaluateInvoiceTransition('issued', 'sent'), { accepted: false, changed: false, status: 'issued', reason: 'transition_not_allowed' })

const stableRow = { workspaceId: 'workspace-fixture', formId: 'form-fixture', paymentReference: 'payment-reference-fixture', email: 'fixture@example.test', amountMinor: 12000 }
const stableCandidate = { id: 'invoice-fixture', workspaceId: 'workspace-fixture', formId: 'form-fixture', paymentReference: 'payment-reference-fixture' }
assert.deepEqual(matchInvoiceImportRow(stableRow, [stableCandidate]), { status: 'matched', strategy: 'payment_reference', candidateId: 'invoice-fixture' })
assert.deepEqual(matchInvoiceImportRow({ ...stableRow, paymentReference: undefined }, [stableCandidate]), { status: 'unmatched', reason: 'no_stable_reference' })
assert.deepEqual(matchInvoiceImportRow({ ...stableRow, providerInvoiceId: 'provider-invoice-fixture' }, [stableCandidate, { id: 'invoice-other', workspaceId: 'workspace-fixture', formId: 'form-fixture', providerInvoiceId: 'provider-invoice-fixture' }]), { status: 'conflict', reason: 'multiple_references_conflict' })

const keyInput = { workspaceId: 'workspace-fixture', paymentOrderId: 'payment-fixture', purpose: 'invoice_delivery' }
assert.deepEqual(buildInvoiceIdempotencyKey(keyInput), buildInvoiceIdempotencyKey(keyInput))
assert.notEqual(buildInvoiceIdempotencyKey(keyInput).key, buildInvoiceIdempotencyKey({ ...keyInput, purpose: 'invoice_import' }).key)
assert.deepEqual(buildInvoiceIdempotencyKey({ ...keyInput, workspaceId: '' }), { ok: false, reason: 'input_invalid' })

const delivery = buildInvoiceReadyDelivery({
  workspaceId: 'workspace-fixture',
  formId: 'form-fixture',
  submissionId: 'submission-fixture',
  invoiceRecordId: 'invoice-fixture',
  documentId: 'document-fixture',
  invoiceState: 'document_ready',
  documentState: 'quarantined',
  scanStatus: 'clean',
  recipientEmail: 'fixture@example.test',
  formTitle: 'Fixture Event',
  invoiceNumber: null,
  documentUrl: 'https://app.example.test/invoices/document-fixture',
  appOrigin: 'https://app.example.test',
})
assert.deepEqual({ channel: delivery.channel, queueClass: delivery.queueClass, deliveryStatus: delivery.delivery.status }, { channel: 'email', queueClass: 'transactional', deliveryStatus: 'queued' })
assert.equal(delivery.idempotencyKey, 'invoice:invoice-fixture:document:document-fixture:email:v1')
assert.throws(() => buildInvoiceReadyDelivery({
  workspaceId: 'workspace-fixture', formId: 'form-fixture', submissionId: 'submission-fixture', invoiceRecordId: 'invoice-fixture', documentId: 'document-fixture', invoiceState: 'issued', documentState: 'quarantined', scanStatus: 'clean', recipientEmail: 'fixture@example.test', formTitle: 'Fixture Event', documentUrl: 'https://app.example.test/invoices/document-fixture', appOrigin: 'https://app.example.test',
}), /document_ready required/)

console.log('v3-manual-fallback.test: PASS (manual fallback and replay fences only)')
