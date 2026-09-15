import assert from 'node:assert/strict'
import { authorizeBadgeDownload } from '../src/lib/badge-download-contract.ts'

const requester = {
  authenticated: true,
  userId: 'user-1',
  workspaceId: 'workspace-1',
  formId: 'form-1',
  canReadBadge: true,
}
const artifact = {
  artifactId: 'output-7K4M',
  workspaceId: 'workspace-1',
  formId: 'form-1',
  visibility: 'private',
  status: 'READY',
}

const allowed = authorizeBadgeDownload({ requester, artifact, nowMs: 1_000, ttlSeconds: 60 })
assert.deepEqual(allowed, {
  ok: true,
  descriptor: {
    method: 'authenticated-stream',
    artifactId: 'output-7K4M',
    scopeKey: 'badge:workspace-1:form-1:output-7K4M',
    expiresAtMs: 61_000,
  },
})
assert.equal('email' in allowed.descriptor, false)
assert.equal('phone' in allowed.descriptor, false)
assert.equal('payment' in allowed.descriptor, false)

assert.deepEqual(authorizeBadgeDownload({ requester: { ...requester, authenticated: false }, artifact, nowMs: 1_000 }), { ok: false, code: 'AUTH_REQUIRED' })
assert.deepEqual(authorizeBadgeDownload({ requester: { ...requester, canReadBadge: false }, artifact, nowMs: 1_000 }), { ok: false, code: 'BADGE_READ_FORBIDDEN' })
assert.deepEqual(authorizeBadgeDownload({ requester: { ...requester, formId: 'form-2' }, artifact, nowMs: 1_000 }), { ok: false, code: 'SCOPE_MISMATCH' })
assert.deepEqual(authorizeBadgeDownload({ requester, artifact: { ...artifact, status: 'PROCESSING' }, nowMs: 1_000 }), { ok: false, code: 'ARTIFACT_NOT_READY' })
assert.deepEqual(authorizeBadgeDownload({ requester, artifact, nowMs: 1_000, ttlSeconds: 30 }), { ok: false, code: 'TTL_INVALID' })
assert.deepEqual(authorizeBadgeDownload({ requester, artifact, nowMs: 1_000, ttlSeconds: 901 }), { ok: false, code: 'TTL_INVALID' })
assert.deepEqual(authorizeBadgeDownload({ requester, artifact, nowMs: 1_000, ttlSeconds: 60, }), { ok: true, descriptor: { method: 'authenticated-stream', artifactId: 'output-7K4M', scopeKey: 'badge:workspace-1:form-1:output-7K4M', expiresAtMs: 61_000 } })

console.log('badge-download-contract: all assertions passed')
