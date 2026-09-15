import assert from 'node:assert/strict'
import { BADGE_BATCH_MAX_RETRIES, createBadgeBatchJob, shouldRetryBadgeRecord } from '../src/lib/badge-batch-contract.ts'

const input = {
  jobId: 'job-1',
  workspaceId: 'workspace-1',
  formId: 'form-1',
  templateVersionId: 'template-v1',
  snapshotHash: 'hash-abc',
  printProfileId: 'profile-1',
  selectionMode: 'SELECTED',
  eligibleSubmissionIds: ['submission-1', 'submission-2'],
}
const selected = createBadgeBatchJob(input)
assert.equal(selected.ok, true)
assert.equal(selected.job.idempotencyKey, 'job-1:template-v1:hash-abc:profile-1')
assert.equal(selected.job.maxAttempts, 3)
assert.equal(selected.job.leaseSeconds, 120)
assert.deepEqual(selected.job.records, [
  { submissionId: 'submission-1', status: 'PENDING', attempt: 0 },
  { submissionId: 'submission-2', status: 'PENDING', attempt: 0 },
])

const all = createBadgeBatchJob({ ...input, selectionMode: 'ALL', eligibleSubmissionIds: ['submission-1'] })
assert.equal(all.ok, true)
assert.equal(all.job.selectionMode, 'ALL')

assert.deepEqual(createBadgeBatchJob({ ...input, eligibleSubmissionIds: [] }), { ok: false, code: 'SELECTION_EMPTY' })
assert.deepEqual(createBadgeBatchJob({ ...input, eligibleSubmissionIds: ['submission-1', 'submission-1'] }), { ok: false, code: 'SELECTION_DUPLICATE' })
assert.deepEqual(createBadgeBatchJob({ ...input, eligibleSubmissionIds: Array.from({ length: 501 }, (_, index) => `submission-${index}`) }), { ok: false, code: 'SELECTION_TOO_LARGE' })
assert.deepEqual(createBadgeBatchJob({ ...input, eligibleSubmissionIds: ['submission/unsafe'] }), { ok: false, code: 'IDENTIFIER_INVALID' })

assert.equal(shouldRetryBadgeRecord({ submissionId: 'submission-1', status: 'FAILED', attempt: 1 }), true)
assert.equal(shouldRetryBadgeRecord({ submissionId: 'submission-1', status: 'FAILED', attempt: BADGE_BATCH_MAX_RETRIES }), false)
assert.equal(shouldRetryBadgeRecord({ submissionId: 'submission-1', status: 'PENDING', attempt: 0 }), false)

console.log('badge-batch-contract: all assertions passed')
