import assert from 'node:assert/strict'
import { BADGE_ARTIFACT_MAX_BYTES, createBadgeArtifactDescriptor } from '../src/lib/badge-artifact-storage-contract.ts'

const base = {
  artifactId: 'artifact-1',
  workspaceId: 'workspace-1',
  formId: 'form-1',
  outputId: 'output-1',
  storageKey: 'badge/workspace-1/form-1/artifact-1/output-1.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 2048,
  sha256: 'a'.repeat(64),
  scanStatus: 'PENDING',
}

assert.deepEqual(createBadgeArtifactDescriptor(base), {
  ok: true,
  descriptor: {
    artifactId: 'artifact-1', workspaceId: 'workspace-1', formId: 'form-1', outputId: 'output-1', storageKey: 'badge/workspace-1/form-1/artifact-1/output-1.pdf', mimeType: 'application/pdf', sizeBytes: 2048, sha256: 'a'.repeat(64), visibility: 'private', state: 'QUARANTINED', downloadable: false,
  },
})
assert.equal(createBadgeArtifactDescriptor({ ...base, scanStatus: 'PASSED' }).descriptor.downloadable, true)
assert.equal(createBadgeArtifactDescriptor({ ...base, scanStatus: 'FAILED' }).descriptor.state, 'BLOCKED')
assert.deepEqual(createBadgeArtifactDescriptor({ ...base, storageKey: 'badge/workspace-1/form-1/../../public.pdf' }), { ok: false, code: 'STORAGE_KEY_INVALID' })
assert.deepEqual(createBadgeArtifactDescriptor({ ...base, storageKey: 'badge/workspace-2/form-1/artifact-1/output-1.pdf' }), { ok: false, code: 'STORAGE_KEY_INVALID' })
assert.deepEqual(createBadgeArtifactDescriptor({ ...base, mimeType: 'application/octet-stream' }), { ok: false, code: 'MIME_INVALID' })
assert.deepEqual(createBadgeArtifactDescriptor({ ...base, sizeBytes: BADGE_ARTIFACT_MAX_BYTES + 1 }), { ok: false, code: 'SIZE_INVALID' })
assert.deepEqual(createBadgeArtifactDescriptor({ ...base, sha256: 'A'.repeat(64) }), { ok: false, code: 'SHA256_INVALID' })

console.log('badge-artifact-storage-contract: all assertions passed')
