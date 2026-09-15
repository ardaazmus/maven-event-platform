import assert from 'node:assert/strict'
import { createBadgeGenerationJob } from '../src/lib/badge-generation-job-contract.ts'

const entry = {
  surface: 'SUBMISSION_SELECTION',
  selectionMode: 'SELECTED',
  workspaceId: 'workspace-1',
  formId: 'form-1',
  submissionIds: ['submission-1', 'submission-2'],
}
const input = {
  entry,
  jobId: 'job-1',
  templateVersionId: 'template-v1',
  snapshotHash: 'hash-abc',
  printProfileId: 'profile-1',
  faceMode: 'SINGLE_FACE',
}

const selected = createBadgeGenerationJob(input)
assert.equal(selected.ok, true)
assert.equal(selected.job.batchJob.selectionMode, 'SELECTED')
assert.equal(selected.job.batchJob.idempotencyKey, 'job-1:template-v1:hash-abc:profile-1')
assert.equal(selected.job.rendererRequired, true)
assert.equal(selected.job.outputExportEnabled, false)
assert.deepEqual(selected.job.batchJob.records, [
  { submissionId: 'submission-1', status: 'PENDING', attempt: 0 },
  { submissionId: 'submission-2', status: 'PENDING', attempt: 0 },
])

const all = createBadgeGenerationJob({ ...input, entry: { ...entry, selectionMode: 'ALL' }, faceMode: 'DUAL_FACE' })
assert.equal(all.ok, true)
assert.equal(all.job.selectionMode, 'ALL')
assert.equal(all.job.faceMode, 'DUAL_FACE')
assert.equal(all.job.batchJob.selectionMode, 'ALL')
assert.deepEqual(createBadgeGenerationJob({ ...input, entry: { ...entry, workspaceId: 'workspace/unsafe' } }), { ok: false, code: 'SCOPE_INVALID' })
assert.deepEqual(createBadgeGenerationJob({ ...input, faceMode: 'TRIPLE_FACE' }), { ok: false, code: 'FACE_MODE_INVALID' })
assert.deepEqual(createBadgeGenerationJob({ ...input, entry: { ...entry, submissionIds: [] } }), { ok: false, code: 'SELECTION_EMPTY' })
assert.deepEqual(createBadgeGenerationJob({ ...input, entry: { ...entry, submissionIds: Array.from({ length: 501 }, (_, index) => `submission-${index}`) } }), { ok: false, code: 'SELECTION_TOO_LARGE' })

console.log('badge-generation-job-contract: all assertions passed')
