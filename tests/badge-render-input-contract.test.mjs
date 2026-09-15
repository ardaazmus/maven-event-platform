import assert from 'node:assert/strict'
import { createBadgeRenderInputDescriptor } from '../src/lib/badge-render-input-contract.ts'

const job = { jobId: 'job-1', workspaceId: 'workspace-1', formId: 'form-1', templateVersionId: 'template-v1', printProfileId: 'profile-1' }
const snapshot = { snapshotId: 'snapshot-1', workspaceId: 'workspace-1', formId: 'form-1', submissionId: 'submission-1' }

const secure = createBadgeRenderInputDescriptor({
  job,
  snapshot,
  badgeInstanceId: 'badge-instance-1',
  qrCredential: {
    mode: 'SECURE_TOKEN', payload: 'opaque-token-123456', workspaceId: 'workspace-1', formId: 'form-1', badgeInstanceId: 'badge-instance-1', revoked: false,
  },
})
assert.deepEqual(secure, {
  ok: true,
  descriptor: {
    jobId: 'job-1', workspaceId: 'workspace-1', formId: 'form-1', templateVersionId: 'template-v1', snapshotId: 'snapshot-1', submissionId: 'submission-1', printProfileId: 'profile-1', badgeInstanceId: 'badge-instance-1', qrMode: 'SECURE_TOKEN', qrStatus: 'VALID', rendererRequired: true,
  },
})
assert.equal('payload' in secure.descriptor, false)
assert.equal('storageKey' in secure.descriptor, false)

const withoutQr = createBadgeRenderInputDescriptor({ job, snapshot, badgeInstanceId: 'badge-instance-1' })
assert.deepEqual(withoutQr.descriptor, {
  jobId: 'job-1', workspaceId: 'workspace-1', formId: 'form-1', templateVersionId: 'template-v1', snapshotId: 'snapshot-1', submissionId: 'submission-1', printProfileId: 'profile-1', badgeInstanceId: 'badge-instance-1', qrMode: 'NONE', qrStatus: 'DISABLED', rendererRequired: true,
})
assert.deepEqual(createBadgeRenderInputDescriptor({ job, snapshot: { ...snapshot, workspaceId: 'workspace-2' }, badgeInstanceId: 'badge-instance-1' }), { ok: false, code: 'SCOPE_MISMATCH' })
assert.deepEqual(createBadgeRenderInputDescriptor({ job, snapshot, badgeInstanceId: 'badge-instance-1', qrCredential: { mode: 'SECURE_TOKEN', payload: 'opaque-token-123456', workspaceId: 'workspace-1', formId: 'form-1', badgeInstanceId: 'badge-instance-1', revoked: true } }), { ok: false, code: 'REVOKED' })
assert.deepEqual(createBadgeRenderInputDescriptor({ job, snapshot, badgeInstanceId: 'badge-instance-1', qrCredential: { mode: 'SECURE_TOKEN', payload: 'short', workspaceId: 'workspace-1', formId: 'form-1', badgeInstanceId: 'badge-instance-1', revoked: false } }), { ok: false, code: 'OPAQUE_TOKEN_INVALID' })
assert.deepEqual(createBadgeRenderInputDescriptor({ job: { ...job, printProfileId: 'unsafe profile' }, snapshot, badgeInstanceId: 'badge-instance-1' }), { ok: false, code: 'IDENTIFIER_INVALID' })

console.log('badge-render-input-contract: all assertions passed')
