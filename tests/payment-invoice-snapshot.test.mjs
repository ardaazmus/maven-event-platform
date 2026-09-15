import assert from 'node:assert/strict'
import { persistPaymentInvoiceSnapshot } from '../src/lib/payment-invoice-snapshot.ts'

const calls = []
const recipient = {
  recipientType: 'individual',
  legalNameEncrypted: 'enc:name',
  identityNumberEncrypted: 'enc:id',
  source: 'published_form',
}
const order = { id: 'po_1', workspaceId: 'ws_1', provider: 'iyzico', status: 'succeeded', amountMinor: 12550, currency: 'TRY' }
const lines = [{ lineNumber: 1, description: 'Event registration', quantity: '1', unitPriceMinor: 12550, lineTotalMinor: 12550, currency: 'TRY' }]
const tx = {
  invoiceRecipientSnapshot: {
    findUnique: async () => null,
    create: async ({ data }) => { calls.push('recipient'); assert.equal(data.workspaceId, 'ws_1'); return { id: 'rs_1' } },
  },
  invoiceRecord: {
    findUnique: async () => null,
    create: async ({ data }) => { calls.push('invoice'); assert.equal(data.paymentOrderId, 'po_1'); return { id: 'inv_1', state: data.state } },
  },
  invoiceLineSnapshot: {
    createMany: async ({ data }) => { calls.push('lines'); assert.equal(data[0].invoiceRecordId, 'inv_1'); return { count: 1 } },
  },
}

assert.deepEqual(await persistPaymentInvoiceSnapshot(tx, { order, recipient, recipientValidationStatus: 'valid', documentType: 'unspecified', lines }), {
  ok: true, reused: false, invoiceRecordId: 'inv_1', state: 'paid_ready_for_invoicing',
})
assert.deepEqual(calls, ['recipient', 'invoice', 'lines'], 'all snapshots must be persisted in one transaction seam')

const pending = await persistPaymentInvoiceSnapshot(tx, { order: { ...order, status: 'processing' }, recipient, recipientValidationStatus: 'valid', documentType: 'unspecified', lines })
assert.deepEqual(pending, { ok: false, reason: 'payment_not_succeeded' })

const mismatch = await persistPaymentInvoiceSnapshot(tx, { order, recipient, recipientValidationStatus: 'valid', documentType: 'unspecified', lines: [{ ...lines[0], lineTotalMinor: 1 }] })
assert.deepEqual(mismatch, { ok: false, reason: 'amount_mismatch' })

const review = await persistPaymentInvoiceSnapshot(tx, { order, recipient, recipientValidationStatus: 'review_required', documentType: 'unspecified', lines })
assert.deepEqual(review, { ok: true, reused: false, invoiceRecordId: 'inv_1', state: 'accounting_review_required' })

const invalidRecipient = await persistPaymentInvoiceSnapshot(tx, { order, recipient, recipientValidationStatus: 'invalid', documentType: 'unspecified', lines })
assert.deepEqual(invalidRecipient, { ok: false, reason: 'recipient_invalid' })

console.log('payment-invoice-snapshot.test: PASS (INV/F C-02)')
