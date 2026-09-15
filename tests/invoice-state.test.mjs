import assert from 'node:assert/strict'
import { evaluateInvoiceTransition } from '../src/lib/invoice-state.ts'

assert.deepEqual(evaluateInvoiceTransition('paid_ready_for_invoicing', 'queued'), {
  accepted: true,
  changed: true,
  status: 'queued',
})

assert.deepEqual(evaluateInvoiceTransition('queued', 'issued'), {
  accepted: false,
  changed: false,
  status: 'queued',
  reason: 'transition_not_allowed',
})

assert.deepEqual(evaluateInvoiceTransition('queued', 'provider_draft_submitting'), {
  accepted: true,
  changed: true,
  status: 'provider_draft_submitting',
})

assert.deepEqual(evaluateInvoiceTransition('provider_draft_submitting', 'reconciliation_required'), {
  accepted: true,
  changed: true,
  status: 'reconciliation_required',
})

assert.deepEqual(evaluateInvoiceTransition('document_ready', 'document_ready'), {
  accepted: true,
  changed: false,
  status: 'document_ready',
})

assert.deepEqual(evaluateInvoiceTransition('delivery_queued', 'refund_or_credit_note_review'), {
  accepted: true,
  changed: true,
  status: 'refund_or_credit_note_review',
})

assert.deepEqual(evaluateInvoiceTransition('not_a_state', 'queued'), {
  accepted: false,
  changed: false,
  status: 'not_a_state',
  reason: 'state_invalid',
})

console.log('PASS invoice-state tests')
