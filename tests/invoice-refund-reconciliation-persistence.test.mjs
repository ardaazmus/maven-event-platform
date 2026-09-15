import assert from 'node:assert/strict'
import { persistInvoiceRefundReview } from '../src/lib/invoice-refund-reconciliation-persistence.ts'

const base = { workspaceId: 'workspace-1', invoiceRecordId: 'invoice-1', paymentStatus: 'refunded', eventKind: 'refund', invoiceState: 'issued' }

function client({ invoice = { id: 'invoice-1', state: 'issued' }, updated = 1 } = {}) {
  const calls = []
  return {
    calls,
    async $transaction(work) {
      return work({
        invoiceRecord: {
          async findFirst(query) { calls.push(['invoice.findFirst', query]); return invoice },
          async updateMany(query) { calls.push(['invoice.updateMany', query]); return { count: updated } },
        },
        auditLog: { async create(query) { calls.push(['audit.create', query]); return { id: 'audit-1' } } },
      })
    },
  }
}

const changed = client()
assert.deepEqual(await persistInvoiceRefundReview(base, changed), { status: 'review_required', invoiceRecordId: 'invoice-1' })
assert.equal(changed.calls.find(([name]) => name === 'invoice.updateMany')[1].where.state, 'issued')
assert.equal(changed.calls.find(([name]) => name === 'audit.create')[1].data.afterJson.includes('manual_review'), true)
assert.deepEqual(await persistInvoiceRefundReview(base, client({ invoice: { id: 'invoice-1', state: 'refund_or_credit_note_review' } })), { status: 'duplicate', invoiceRecordId: 'invoice-1' })
assert.deepEqual(await persistInvoiceRefundReview(base, client({ updated: 0 })), { status: 'blocked', reason: 'state_changed' })
assert.deepEqual(await persistInvoiceRefundReview(base, client({ invoice: null })), { status: 'blocked', reason: 'scope_mismatch' })
assert.deepEqual(await persistInvoiceRefundReview({ ...base, paymentStatus: 'succeeded' }, client()), { status: 'blocked', reason: 'payment_state_invalid' })
assert.deepEqual(await persistInvoiceRefundReview({ ...base, eventKind: 'chargeback', paymentStatus: 'refunded' }, client()), { status: 'blocked', reason: 'event_state_conflict' })

console.log('invoice-refund-reconciliation-persistence.test: PASS (R-00-02)')
