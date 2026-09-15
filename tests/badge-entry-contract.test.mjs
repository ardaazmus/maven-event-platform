import assert from 'node:assert/strict'
import { createBadgeEntry } from '../src/lib/badge-entry-contract.ts'

const base = {
  surface: 'FORM_DETAIL',
  selectionMode: 'SINGLE',
  workspaceId: 'workspace-1',
  formId: 'form-1',
  formStatus: 'PUBLISHED',
  authenticated: true,
  userId: 'user-1',
  canReadBadge: true,
  selectedSubmissionIds: ['submission-1'],
  eligibleSubmissionIds: ['submission-1', 'submission-2'],
}

assert.deepEqual(createBadgeEntry(base), {
  ok: true,
  entry: { surface: 'FORM_DETAIL', selectionMode: 'SINGLE', workspaceId: 'workspace-1', formId: 'form-1', submissionIds: ['submission-1'] },
})
assert.deepEqual(createBadgeEntry({ ...base, surface: 'SUBMISSION_SELECTION', selectionMode: 'SELECTED', selectedSubmissionIds: ['submission-1', 'submission-2'] }), {
  ok: true,
  entry: { surface: 'SUBMISSION_SELECTION', selectionMode: 'SELECTED', workspaceId: 'workspace-1', formId: 'form-1', submissionIds: ['submission-1', 'submission-2'] },
})
assert.deepEqual(createBadgeEntry({ ...base, surface: 'SUBMISSION_SELECTION', selectionMode: 'ALL', selectedSubmissionIds: [] }), {
  ok: true,
  entry: { surface: 'SUBMISSION_SELECTION', selectionMode: 'ALL', workspaceId: 'workspace-1', formId: 'form-1', submissionIds: ['submission-1', 'submission-2'] },
})

assert.deepEqual(createBadgeEntry({ ...base, authenticated: false }), { ok: false, code: 'AUTH_REQUIRED' })
assert.deepEqual(createBadgeEntry({ ...base, canReadBadge: false }), { ok: false, code: 'BADGE_READ_FORBIDDEN' })
assert.deepEqual(createBadgeEntry({ ...base, formStatus: 'DRAFT' }), { ok: false, code: 'FORM_NOT_PUBLISHED' })
assert.deepEqual(createBadgeEntry({ ...base, selectedSubmissionIds: [] }), { ok: false, code: 'SELECTION_REQUIRED' })
assert.deepEqual(createBadgeEntry({ ...base, selectedSubmissionIds: ['submission-1', 'submission-1'] }), { ok: false, code: 'SELECTION_DUPLICATE' })
assert.deepEqual(createBadgeEntry({ ...base, selectedSubmissionIds: ['submission-other'] }), { ok: false, code: 'SELECTION_OUTSIDE_ELIGIBLE' })
assert.deepEqual(createBadgeEntry({ ...base, selectionMode: 'ALL', eligibleSubmissionIds: [] }), { ok: false, code: 'SELECTION_REQUIRED' })

console.log('badge-entry-contract: all assertions passed')
