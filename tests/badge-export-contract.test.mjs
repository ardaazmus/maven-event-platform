import assert from 'node:assert/strict'
import { buildBadgeExportPackage } from '../src/lib/badge-export-contract.ts'

const base = {
  jobId: 'job-1',
  workspaceId: 'workspace-1',
  formId: 'form-1',
  templateVersionId: 'template-v1',
  printProfileId: 'profile-1',
  faceMode: 'SINGLE_FACE',
  entries: [
    { submissionId: 'submission-1', artifactId: 'artifact-1', filename: 'Ada-Lovelace-Event-Form-output1.pdf', status: 'SUCCEEDED' },
    { submissionId: 'submission-2', artifactId: 'artifact-2', status: 'FAILED', errorCode: 'SNAPSHOT_MISSING' },
  ],
}

const single = buildBadgeExportPackage(base)
assert.equal(single.ok, true)
assert.equal(single.package.combinedPdfName, 'combined-front.pdf')
assert.equal(single.package.zipName, 'badge-export-job-1.zip')
assert.deepEqual(single.package.filesInZip, ['Ada-Lovelace-Event-Form-output1.pdf'])
assert.deepEqual(single.package.manifest, {
  jobId: 'job-1', workspaceId: 'workspace-1', formId: 'form-1', templateVersionId: 'template-v1', printProfileId: 'profile-1', faceMode: 'SINGLE_FACE', total: 2, succeeded: 1, failed: 1,
  entries: [
    { submissionId: 'submission-1', artifactId: 'artifact-1', filename: 'Ada-Lovelace-Event-Form-output1.pdf', status: 'SUCCEEDED' },
    { submissionId: 'submission-2', artifactId: 'artifact-2', status: 'FAILED', errorCode: 'SNAPSHOT_MISSING' },
  ],
})

const dual = buildBadgeExportPackage({ ...base, faceMode: 'DUAL_FACE', entries: [base.entries[0]] })
assert.equal(dual.ok, true)
assert.equal(dual.package.combinedPdfName, 'combined-duplex.pdf')
assert.deepEqual(buildBadgeExportPackage({ ...base, entries: [{ ...base.entries[0], filename: 'A.pdf' }, { ...base.entries[0], submissionId: 'submission-2', artifactId: 'artifact-2', filename: 'a.PDF' }] }), { ok: false, code: 'DUPLICATE_FILENAME', value: 'a.PDF' })
assert.deepEqual(buildBadgeExportPackage({ ...base, entries: [{ ...base.entries[0], filename: 'unsafe/name.pdf' }] }), { ok: false, code: 'FILENAME_INVALID', value: 'unsafe/name.pdf' })
assert.deepEqual(buildBadgeExportPackage({ ...base, entries: [{ ...base.entries[0], filename: undefined }] }), { ok: false, code: 'SUCCESS_FILENAME_REQUIRED', value: 'artifact-1' })
assert.deepEqual(buildBadgeExportPackage({ ...base, entries: [{ ...base.entries[0], submissionId: 'submission-1' }, { ...base.entries[0], artifactId: 'artifact-2' }] }), { ok: false, code: 'DUPLICATE_SUBMISSION', value: 'submission-1' })

console.log('badge-export-contract: all assertions passed')
