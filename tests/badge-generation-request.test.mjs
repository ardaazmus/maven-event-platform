import assert from 'node:assert/strict'
import { BADGE_GENERATION_MAX_SUBMISSIONS, validateBadgeGenerationRequest } from '../src/lib/badge-generation-request.ts'
const base = { templateId: 'template-1', templateVersionId: 'version-1', selectionMode: 'SELECTED', submissionIds: ['submission-1'] }
assert.equal(validateBadgeGenerationRequest(base).ok, true)
assert.deepEqual(validateBadgeGenerationRequest({ ...base, submissionIds: ['submission-1', 'submission-1'] }), { ok: false, code: 'SELECTION_DUPLICATE' })
assert.deepEqual(validateBadgeGenerationRequest({ ...base, selectionMode: 'SINGLE', submissionIds: [] }), { ok: false, code: 'SELECTION_EMPTY' })
assert.deepEqual(validateBadgeGenerationRequest({ ...base, submissionIds: Array.from({ length: BADGE_GENERATION_MAX_SUBMISSIONS + 1 }, (_, i) => `submission-${i}`) }), { ok: false, code: 'SELECTION_TOO_LARGE' })
console.log('badge-generation-request: all assertions passed')
