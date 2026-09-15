import assert from 'node:assert/strict'
import { resolveBadgeEntrySurface } from '../src/lib/badge-entry-surface-contract.ts'

const base = {
  authenticated: true,
  canReadBadge: true,
  formStatus: 'published',
  workspaceMatchesForm: true,
  eligibleSubmissionCount: 3,
}

assert.deepEqual(resolveBadgeEntrySurface({ ...base, surface: 'FORM_DETAIL' }), {
  surface: 'FORM_DETAIL', visibility: 'VISIBLE', action: 'CREATE_BADGE', reason: 'READY',
})
assert.deepEqual(resolveBadgeEntrySurface({ ...base, surface: 'SUBMISSION_SELECTION' }), {
  surface: 'SUBMISSION_SELECTION', visibility: 'VISIBLE', action: 'CREATE_BADGE', reason: 'READY',
})
assert.deepEqual(resolveBadgeEntrySurface({ ...base, authenticated: false, surface: 'FORM_DETAIL' }), {
  surface: 'FORM_DETAIL', visibility: 'HIDDEN', action: null, reason: 'AUTH_REQUIRED',
})
assert.deepEqual(resolveBadgeEntrySurface({ ...base, canReadBadge: false, surface: 'FORM_DETAIL' }), {
  surface: 'FORM_DETAIL', visibility: 'HIDDEN', action: null, reason: 'BADGE_READ_FORBIDDEN',
})
assert.deepEqual(resolveBadgeEntrySurface({ ...base, workspaceMatchesForm: false, surface: 'SUBMISSION_SELECTION' }), {
  surface: 'SUBMISSION_SELECTION', visibility: 'HIDDEN', action: null, reason: 'SCOPE_REQUIRED',
})
assert.deepEqual(resolveBadgeEntrySurface({ ...base, formStatus: 'draft', surface: 'FORM_DETAIL' }), {
  surface: 'FORM_DETAIL', visibility: 'DISABLED', action: null, reason: 'FORM_NOT_PUBLISHED',
})
assert.deepEqual(resolveBadgeEntrySurface({ ...base, eligibleSubmissionCount: 0, surface: 'SUBMISSION_SELECTION' }), {
  surface: 'SUBMISSION_SELECTION', visibility: 'DISABLED', action: null, reason: 'SELECTION_REQUIRED',
})
assert.deepEqual(resolveBadgeEntrySurface({ ...base, eligibleSubmissionCount: Number.POSITIVE_INFINITY, surface: 'FORM_DETAIL' }), {
  surface: 'FORM_DETAIL', visibility: 'DISABLED', action: null, reason: 'SELECTION_REQUIRED',
})

const decision = resolveBadgeEntrySurface({ ...base, surface: 'FORM_DETAIL' })
assert.equal('email' in decision, false)
assert.equal('qrPayload' in decision, false)
assert.equal('fileUrl' in decision, false)

console.log('badge-entry-surface-contract: all assertions passed')
