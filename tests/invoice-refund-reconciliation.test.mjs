import assert from 'node:assert/strict'
import { reconcileInvoiceRefund } from '../src/lib/invoice-refund-reconciliation.ts'

assert.deepEqual(reconcileInvoiceRefund({ paymentStatus: 'refunded', eventKind: 'refund', invoiceState: 'issued' }), {
  status: 'review_required', changed: true, nextInvoiceState: 'refund_or_credit_note_review', deliveryAction: 'hold', documentAction: 'remain_private', accountingAction: 'manual_review',
})
assert.deepEqual(reconcileInvoiceRefund({ paymentStatus: 'disputed', eventKind: 'chargeback', invoiceState: 'sent' }), {
  status: 'review_required', changed: true, nextInvoiceState: 'refund_or_credit_note_review', deliveryAction: 'hold', documentAction: 'remain_private', accountingAction: 'manual_review',
})
assert.deepEqual(reconcileInvoiceRefund({ paymentStatus: 'refunded', eventKind: 'refund', invoiceState: 'refund_or_credit_note_review' }), {
  status: 'already_under_review', changed: false, nextInvoiceState: 'refund_or_credit_note_review', deliveryAction: 'hold', documentAction: 'remain_private', accountingAction: 'manual_review',
})
assert.deepEqual(reconcileInvoiceRefund({ paymentStatus: 'refunded', eventKind: 'refund', invoiceState: 'not_started' }), { status: 'no_invoice_action', changed: false, deliveryAction: 'none', documentAction: 'none', accountingAction: 'none' })
assert.deepEqual(reconcileInvoiceRefund({ paymentStatus: 'succeeded', eventKind: 'refund', invoiceState: 'issued' }), { status: 'blocked', reason: 'payment_state_invalid' })
assert.deepEqual(reconcileInvoiceRefund({ paymentStatus: 'disputed', eventKind: 'refund', invoiceState: 'issued' }), { status: 'blocked', reason: 'event_state_conflict' })
assert.deepEqual(reconcileInvoiceRefund({ paymentStatus: 'refunded', eventKind: 'refund', invoiceState: 'unknown' }), { status: 'blocked', reason: 'invoice_state_invalid' })

console.log('invoice-refund-reconciliation.test: PASS (R-00-01)')
