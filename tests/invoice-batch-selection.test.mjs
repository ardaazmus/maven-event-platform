import assert from 'node:assert/strict'
import { selectInvoiceBatchRows } from '../src/lib/invoice-batch-selection.ts'

const candidates = [
  { id: 'order_1', workspaceId: 'workspace_1', formId: 'form_1', submissionId: 'submission_1', publishedVersionId: 'version_1', provider: 'stripe', amountMinor: 1000, currency: 'TRY' },
  { id: 'order_2', workspaceId: 'workspace_1', formId: 'form_1', submissionId: 'submission_2', publishedVersionId: 'version_1', provider: 'stripe', amountMinor: 2000, currency: 'TRY' },
  { id: 'other_workspace', workspaceId: 'workspace_2', formId: 'form_1', submissionId: 'submission_3', publishedVersionId: 'version_1', provider: 'stripe', amountMinor: 3000, currency: 'TRY' },
  { id: 'other_form', workspaceId: 'workspace_1', formId: 'form_2', submissionId: 'submission_4', publishedVersionId: 'version_1', provider: 'stripe', amountMinor: 4000, currency: 'TRY' },
]

assert.deepEqual(selectInvoiceBatchRows({ candidates, selectedPaymentOrderIds: ['order_1'], workspaceId: 'workspace_1', formId: 'form_1' }), {
  ok: true,
  rows: [{ rowNumber: 1, paymentOrderIdSnapshot: 'order_1' }],
})
assert.deepEqual(selectInvoiceBatchRows({ candidates, selectedPaymentOrderIds: ['order_1', 'order_2'], workspaceId: 'workspace_1', formId: 'form_1' }), {
  ok: true,
  rows: [
    { rowNumber: 1, paymentOrderIdSnapshot: 'order_1' },
    { rowNumber: 2, paymentOrderIdSnapshot: 'order_2' },
  ],
})
assert.deepEqual(selectInvoiceBatchRows({ candidates, selectedPaymentOrderIds: [], workspaceId: 'workspace_1', formId: 'form_1' }), { ok: false, reason: 'selection_empty' })
assert.deepEqual(selectInvoiceBatchRows({ candidates, selectedPaymentOrderIds: ['order_1', 'order_1'], workspaceId: 'workspace_1', formId: 'form_1' }), { ok: false, reason: 'selection_duplicate' })
assert.deepEqual(selectInvoiceBatchRows({ candidates, selectedPaymentOrderIds: ['missing'], workspaceId: 'workspace_1', formId: 'form_1' }), { ok: false, reason: 'candidate_not_found' })
assert.deepEqual(selectInvoiceBatchRows({ candidates, selectedPaymentOrderIds: ['other_workspace'], workspaceId: 'workspace_1', formId: 'form_1' }), { ok: false, reason: 'scope_mismatch' })
assert.deepEqual(selectInvoiceBatchRows({ candidates, selectedPaymentOrderIds: ['other_form'], workspaceId: 'workspace_1', formId: 'form_1' }), { ok: false, reason: 'scope_mismatch' })

console.log('invoice-batch-selection.test: PASS (INV/F-X-01-01)')
