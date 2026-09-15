import assert from 'node:assert/strict'
import { selectInvoiceBatchByFilter } from '../src/lib/invoice-batch-selection.ts'

const candidates = [
  { id: 'order_1', workspaceId: 'workspace_1', formId: 'form_1', submissionId: 'submission_1', publishedVersionId: 'version_1', provider: 'stripe', status: 'succeeded', createdAt: '2026-09-01T10:00:00.000Z', amountMinor: 1000, currency: 'TRY' },
  { id: 'order_2', workspaceId: 'workspace_1', formId: 'form_2', submissionId: 'submission_2', publishedVersionId: 'version_1', provider: 'stripe', status: 'succeeded', createdAt: '2026-09-02T10:00:00.000Z', amountMinor: 2500, currency: 'USD' },
  { id: 'order_3', workspaceId: 'workspace_1', formId: 'form_1', submissionId: 'submission_3', publishedVersionId: 'version_1', provider: 'stripe', status: 'succeeded', createdAt: '2026-09-03T10:00:00.000Z', amountMinor: 3000, currency: 'TRY' },
  { id: 'foreign', workspaceId: 'workspace_2', formId: 'form_1', submissionId: 'submission_4', publishedVersionId: 'version_1', provider: 'stripe', status: 'succeeded', createdAt: '2026-09-03T10:00:00.000Z', amountMinor: 9000, currency: 'TRY' },
]

assert.deepEqual(selectInvoiceBatchByFilter({
  candidates,
  workspaceId: 'workspace_1',
  filter: { formIds: ['form_1'], currencies: ['TRY'], statuses: ['succeeded'], createdFrom: '2026-09-01T00:00:00Z', createdTo: '2026-09-03T23:59:59Z' },
}), {
  ok: true,
  filterSnapshot: { formIds: ['form_1'], currencies: ['TRY'], statuses: ['succeeded'], createdFrom: '2026-09-01T00:00:00.000Z', createdTo: '2026-09-03T23:59:59.000Z' },
  rows: [
    { rowNumber: 1, paymentOrderIdSnapshot: 'order_1' },
    { rowNumber: 2, paymentOrderIdSnapshot: 'order_3' },
  ],
  totalCount: 2,
  totalAmountMinor: 4000,
})

assert.deepEqual(selectInvoiceBatchByFilter({ candidates, workspaceId: 'workspace_1', filter: {} }), {
  ok: true,
  filterSnapshot: { formIds: [], currencies: [], statuses: [], createdFrom: null, createdTo: null },
  rows: [
    { rowNumber: 1, paymentOrderIdSnapshot: 'order_1' },
    { rowNumber: 2, paymentOrderIdSnapshot: 'order_2' },
    { rowNumber: 3, paymentOrderIdSnapshot: 'order_3' },
  ],
  totalCount: 3,
  totalAmountMinor: 6500,
})

assert.deepEqual(selectInvoiceBatchByFilter({ candidates, workspaceId: 'workspace_1', filter: { currencies: ['TRY', 'TRY'] } }), { ok: false, reason: 'filter_invalid' })
assert.deepEqual(selectInvoiceBatchByFilter({ candidates, workspaceId: 'workspace_1', filter: { createdFrom: '2026-09-04T00:00:00Z', createdTo: '2026-09-01T00:00:00Z' } }), { ok: false, reason: 'filter_invalid' })
assert.deepEqual(selectInvoiceBatchByFilter({ candidates, workspaceId: 'workspace_1', filter: { formIds: ['form_2'], statuses: ['failed'] } }), { ok: true, filterSnapshot: { formIds: ['form_2'], currencies: [], statuses: ['failed'], createdFrom: null, createdTo: null }, rows: [], totalCount: 0, totalAmountMinor: 0 })

console.log('invoice-batch-filter-selection.test: PASS (INV/F-X-02-01)')
