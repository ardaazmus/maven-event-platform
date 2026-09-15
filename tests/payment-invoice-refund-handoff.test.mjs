import assert from 'node:assert/strict'
import { handoffVerifiedPaymentRefundToInvoice, persistInvoiceRefundReviewInTransaction } from '../src/lib/payment-invoice-refund-handoff.ts'

const base = { verified: true, workspaceId: 'workspace-1', paymentOrderId: 'order-1', paymentStatus: 'refunded', eventKind: 'refund', invoice: { id: 'invoice-1', workspaceId: 'workspace-1', paymentOrderId: 'order-1', state: 'issued' } }
const persisted = []
assert.deepEqual(await handoffVerifiedPaymentRefundToInvoice(base, async input => { persisted.push(input); return { status: 'review_required', invoiceRecordId: 'invoice-1' } }), { status: 'review_required', invoiceRecordId: 'invoice-1' })
assert.deepEqual(persisted[0], { workspaceId: 'workspace-1', invoiceRecordId: 'invoice-1', paymentStatus: 'refunded', eventKind: 'refund', invoiceState: 'issued' })
assert.deepEqual(await handoffVerifiedPaymentRefundToInvoice({ ...base, verified: false }, async () => { throw new Error('must not persist') }), { status: 'blocked', reason: 'verification_required' })
assert.deepEqual(await handoffVerifiedPaymentRefundToInvoice({ ...base, invoice: { ...base.invoice, workspaceId: 'workspace-2' } }, async () => { throw new Error('must not persist') }), { status: 'blocked', reason: 'scope_mismatch' })
assert.deepEqual(await handoffVerifiedPaymentRefundToInvoice({ ...base, invoice: null }, async () => { throw new Error('must not persist') }), { status: 'not_applicable' })
assert.deepEqual(await handoffVerifiedPaymentRefundToInvoice(base, async () => ({ status: 'duplicate', invoiceRecordId: 'invoice-1' })), { status: 'duplicate', invoiceRecordId: 'invoice-1' })

const writes = []
const transaction = {
  invoiceRecord: {
    async updateMany(query) { writes.push(['invoice.updateMany', query]); return { count: 1 } },
  },
  auditLog: {
    async create(query) { writes.push(['audit.create', query]); return { id: 'audit-1' } },
  },
}
assert.deepEqual(await persistInvoiceRefundReviewInTransaction({
  workspaceId: base.workspaceId,
  invoiceRecordId: base.invoice.id,
  paymentStatus: base.paymentStatus,
  eventKind: base.eventKind,
  invoiceState: base.invoice.state,
}, base.invoice, transaction), { status: 'review_required', invoiceRecordId: 'invoice-1' })
assert.deepEqual(writes[0], ['invoice.updateMany', {
  where: { id: 'invoice-1', workspaceId: 'workspace-1', state: 'issued' },
  data: { state: 'refund_or_credit_note_review' },
}])
assert.equal(writes[1][0], 'audit.create')
assert.equal(writes.length, 2)

console.log('payment-invoice-refund-handoff.test: PASS (R-00-04)')
