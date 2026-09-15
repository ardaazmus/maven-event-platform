import assert from 'node:assert/strict'
import {
  canTransitionConnectionLifecycle,
  evaluateConnectionJobGate,
  normalizeConnectionLifecycle,
  transitionConnectionLifecycle,
} from '../src/lib/connection-lifecycle-contract.ts'

const pending = { connectionId: 'connection-1', state: 'pending_verification', credentialKeyId: 'key-1', updatedAtMs: 1_000 }
const active = { ...pending, state: 'active', updatedAtMs: 2_000 }

assert.deepEqual(normalizeConnectionLifecycle(pending, 'connection-1'), { ok: true, connection: pending })
assert.equal(canTransitionConnectionLifecycle('pending_verification', 'active'), true)
assert.equal(canTransitionConnectionLifecycle('revoked', 'active'), false)
assert.deepEqual(transitionConnectionLifecycle(pending, 'active', 2_000, 'connection-1'), { ok: true, connection: active })
assert.deepEqual(transitionConnectionLifecycle(active, 'revoked', 3_000), { ok: true, connection: { ...active, state: 'revoked', updatedAtMs: 3_000 } })
assert.deepEqual(transitionConnectionLifecycle({ ...active, state: 'revoked' }, 'active', 4_000), { ok: false, reason: 'revoked_terminal' })
assert.deepEqual(transitionConnectionLifecycle(active, 'pending_verification', 3_000), { ok: false, reason: 'transition_invalid' })

assert.deepEqual(evaluateConnectionJobGate({ connection: active, jobConnectionId: 'connection-1', jobCredentialKeyId: 'key-1' }), { ok: true })
assert.deepEqual(evaluateConnectionJobGate({ connection: pending, jobConnectionId: 'connection-1', jobCredentialKeyId: 'key-1' }), { ok: false, reason: 'connection_not_active' })
assert.deepEqual(evaluateConnectionJobGate({ connection: { ...active, state: 'disabled' }, jobConnectionId: 'connection-1', jobCredentialKeyId: 'key-1' }), { ok: false, reason: 'connection_not_active' })
assert.deepEqual(evaluateConnectionJobGate({ connection: { ...active, state: 'revoked' }, jobConnectionId: 'connection-1', jobCredentialKeyId: 'key-1' }), { ok: false, reason: 'revoked_terminal' })
assert.deepEqual(evaluateConnectionJobGate({ connection: active, jobConnectionId: 'connection-2', jobCredentialKeyId: 'key-1' }), { ok: false, reason: 'connection_mismatch' })
assert.deepEqual(evaluateConnectionJobGate({ connection: active, jobConnectionId: 'connection-1', jobCredentialKeyId: 'key-0' }), { ok: false, reason: 'stale_credential' })
assert.deepEqual(evaluateConnectionJobGate({ connection: active, jobConnectionId: 'connection-1' }), { ok: false, reason: 'stale_credential' })
assert.deepEqual(normalizeConnectionLifecycle({ ...pending, credentialKeyId: '../key' }), { ok: false, reason: 'credential_key_invalid' })
assert.deepEqual(normalizeConnectionLifecycle({ ...pending, secret: 'never-accepted' }), { ok: false, reason: 'secret_forbidden' })

console.log('connection-lifecycle-contract.test: PASS (R10-V4-14)')
