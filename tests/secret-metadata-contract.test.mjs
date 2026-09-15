import assert from 'node:assert/strict'
import { createSecretRotationIntent, normalizeSecretMetadata } from '../src/lib/secret-metadata-contract.ts'

const input = { connectionId: 'conn-1', purpose: 'payment', keyId: 'key-1', envelopeVersion: 'v1', state: 'active', createdAtMs: 10_000, rotatedAtMs: null }
const normalized = normalizeSecretMetadata(input, 'conn-1')
assert.deepEqual(normalized, { ok: true, metadata: input })

if (normalized.ok) {
  assert.deepEqual(
    createSecretRotationIntent({ current: normalized.metadata, nextKeyId: 'key-2', requestedAtMs: 20_000 }),
    { ok: true, intent: { connectionId: 'conn-1', purpose: 'payment', previousKeyId: 'key-1', nextKeyId: 'key-2', requestedAtMs: 20_000, requiresReverification: true, state: 'pending_verification' } },
  )
  assert.deepEqual(createSecretRotationIntent({ current: normalized.metadata, nextKeyId: 'key-1', requestedAtMs: 20_000 }), { ok: false, reason: 'same_key_id' })
  assert.deepEqual(createSecretRotationIntent({ current: { ...normalized.metadata, state: 'revoked' }, nextKeyId: 'key-2', requestedAtMs: 20_000 }), { ok: false, reason: 'current_not_active' })
}

assert.deepEqual(normalizeSecretMetadata({ ...input, apiKey: null }), { ok: false, reason: 'secret_value_forbidden' })
assert.deepEqual(normalizeSecretMetadata({ ...input, keyId: '../key' }), { ok: false, reason: 'key_id_invalid' })
assert.deepEqual(normalizeSecretMetadata({ ...input, envelopeVersion: 'version-1' }), { ok: false, reason: 'version_invalid' })
assert.deepEqual(normalizeSecretMetadata({ ...input, rotatedAtMs: 9_999 }), { ok: false, reason: 'rotation_time_invalid' })
assert.deepEqual(normalizeSecretMetadata({ ...input, connectionId: 'conn-2' }, 'conn-1'), { ok: false, reason: 'connection_mismatch' })

console.log('secret-metadata-contract.test: PASS (R10-V4-12)')
