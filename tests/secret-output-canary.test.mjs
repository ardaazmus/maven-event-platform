import assert from 'node:assert/strict'
import { normalizeSecretSafeAuditEvent } from '../src/lib/secret-output-canary.ts'

const input = {
  action: 'connection.verify',
  resourceType: 'provider_connection',
  resourceId: 'connection-1',
  workspaceId: 'workspace-1',
  outcome: 'verified',
  metadata: { provider: 'iyzico', environment: 'test', capability: 'payment', count: 1 },
}
assert.deepEqual(normalizeSecretSafeAuditEvent(input), { ok: true, event: input })
assert.deepEqual(normalizeSecretSafeAuditEvent(input), normalizeSecretSafeAuditEvent(structuredClone(input)))

for (const sensitive of [
  { ...input, metadata: { token: 'opaque-value' } },
  { ...input, metadata: { providerResponse: 'raw-response' } },
  { ...input, metadata: { email: 'person@example.com' } },
  { ...input, credentialsEnvelope: 'encrypted-value' },
]) assert.deepEqual(normalizeSecretSafeAuditEvent(sensitive), { ok: false, reason: 'secret_forbidden' })

assert.deepEqual(normalizeSecretSafeAuditEvent({ ...input, metadata: { unknown: 'value' } }), { ok: false, reason: 'metadata_key_invalid' })
assert.deepEqual(normalizeSecretSafeAuditEvent({ ...input, metadata: { sha256: 'not allowed!' } }), { ok: false, reason: 'metadata_value_invalid' })
assert.deepEqual(normalizeSecretSafeAuditEvent({ ...input, metadata: { nested: { status: 'verified' } } }), { ok: false, reason: 'metadata_key_invalid' })
assert.deepEqual(normalizeSecretSafeAuditEvent({ ...input, resourceId: '../other-workspace' }), { ok: false, reason: 'input_invalid' })

console.log('secret-output-canary.test: PASS (R10-V4-34)')
