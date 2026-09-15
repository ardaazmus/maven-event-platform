import assert from 'node:assert/strict'
import { selectInvoiceCandidates } from '../src/lib/invoice-candidates.ts'

const orders = [
  { id: 'paid_1', workspaceId: 'workspace_1', formId: 'form_1', submissionId: 'submission_1', publishedVersionId: 'version_1', provider: 'stripe', status: 'succeeded', createdAt: '2026-09-01T10:00:00Z', amountMinor: 12500, currency: 'TRY', paymentStatus: 'paid', invoiceRecordId: null },
  { id: 'other_workspace', workspaceId: 'workspace_2', formId: 'form_1', submissionId: 'submission_2', publishedVersionId: 'version_1', provider: 'stripe', status: 'succeeded', createdAt: '2026-09-01T10:00:00Z', amountMinor: 12500, currency: 'TRY', paymentStatus: 'paid', invoiceRecordId: null },
  { id: 'pending', workspaceId: 'workspace_1', formId: 'form_1', submissionId: 'submission_3', publishedVersionId: 'version_1', provider: 'stripe', status: 'processing', createdAt: '2026-09-01T10:00:00Z', amountMinor: 12500, currency: 'TRY', paymentStatus: 'paid', invoiceRecordId: null },
  { id: 'legacy_failed', workspaceId: 'workspace_1', formId: 'form_1', submissionId: 'submission_4', publishedVersionId: 'version_1', provider: 'stripe', status: 'succeeded', createdAt: '2026-09-01T10:00:00Z', amountMinor: 12500, currency: 'TRY', paymentStatus: 'failed', invoiceRecordId: null },
  { id: 'no_submission', workspaceId: 'workspace_1', formId: 'form_1', submissionId: null, publishedVersionId: 'version_1', provider: 'stripe', status: 'succeeded', createdAt: '2026-09-01T10:00:00Z', amountMinor: 12500, currency: 'TRY', paymentStatus: 'paid', invoiceRecordId: null },
  { id: 'already_invoiced', workspaceId: 'workspace_1', formId: 'form_1', submissionId: 'submission_5', publishedVersionId: 'version_1', provider: 'stripe', status: 'succeeded', createdAt: '2026-09-01T10:00:00Z', amountMinor: 12500, currency: 'TRY', paymentStatus: 'paid', invoiceRecordId: 'invoice_1' },
  { id: 'zero_amount', workspaceId: 'workspace_1', formId: 'form_1', submissionId: 'submission_6', publishedVersionId: 'version_1', provider: 'stripe', status: 'succeeded', createdAt: '2026-09-01T10:00:00Z', amountMinor: 0, currency: 'TRY', paymentStatus: 'paid', invoiceRecordId: null },
]

assert.deepEqual(selectInvoiceCandidates(orders, 'workspace_1'), [{
  id: 'paid_1',
  workspaceId: 'workspace_1',
  formId: 'form_1',
  submissionId: 'submission_1',
  publishedVersionId: 'version_1',
  provider: 'stripe',
  status: 'succeeded',
  createdAt: '2026-09-01T10:00:00.000Z',
  amountMinor: 12500,
  currency: 'TRY',
}])
assert.deepEqual(selectInvoiceCandidates(orders, 'workspace_2'), [{
  id: 'other_workspace',
  workspaceId: 'workspace_2',
  formId: 'form_1',
  submissionId: 'submission_2',
  publishedVersionId: 'version_1',
  provider: 'stripe',
  status: 'succeeded',
  createdAt: '2026-09-01T10:00:00.000Z',
  amountMinor: 12500,
  currency: 'TRY',
}])
assert.deepEqual(selectInvoiceCandidates(orders, ''), [])

console.log('invoice-candidates.test: PASS (INV/F-X-00-01)')
