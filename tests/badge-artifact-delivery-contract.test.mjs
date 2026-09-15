import assert from 'node:assert/strict'
import { authorizeBadgeArtifactDelivery } from '../src/lib/badge-artifact-delivery-contract.ts'
import { createBadgeArtifactDescriptor } from '../src/lib/badge-artifact-storage-contract.ts'

const requester = {
  authenticated: true,
  userId: 'user-1',
  workspaceId: 'workspace-1',
  formId: 'form-1',
  canReadBadge: true,
}
const base = {
  artifactId: 'artifact-1', workspaceId: 'workspace-1', formId: 'form-1', outputId: 'output-1', storageKey: 'badge/workspace-1/form-1/artifact-1/output-1.pdf', mimeType: 'application/pdf', sizeBytes: 2048, sha256: 'a'.repeat(64),
}

const pending = createBadgeArtifactDescriptor({ ...base, scanStatus: 'PENDING' })
const blocked = createBadgeArtifactDescriptor({ ...base, scanStatus: 'FAILED' })
const ready = createBadgeArtifactDescriptor({ ...base, scanStatus: 'PASSED' })
assert.equal(pending.ok && authorizeBadgeArtifactDelivery({ requester, artifact: pending.descriptor, nowMs: 1_000 }).code, 'ARTIFACT_NOT_READY')
assert.equal(blocked.ok && authorizeBadgeArtifactDelivery({ requester, artifact: blocked.descriptor, nowMs: 1_000 }).code, 'ARTIFACT_NOT_READY')
assert.deepEqual(ready.ok && authorizeBadgeArtifactDelivery({ requester, artifact: ready.descriptor, nowMs: 1_000, ttlSeconds: 60 }), {
  ok: true,
  descriptor: { method: 'authenticated-stream', artifactId: 'artifact-1', scopeKey: 'badge:workspace-1:form-1:artifact-1', expiresAtMs: 61_000 },
})
assert.equal(ready.ok && authorizeBadgeArtifactDelivery({ requester: { ...requester, formId: 'form-2' }, artifact: ready.descriptor, nowMs: 1_000 }).code, 'SCOPE_MISMATCH')
assert.equal(ready.ok && authorizeBadgeArtifactDelivery({ requester: { ...requester, canReadBadge: false }, artifact: ready.descriptor, nowMs: 1_000 }).code, 'BADGE_READ_FORBIDDEN')

console.log('badge-artifact-delivery-contract: all assertions passed')
