import assert from 'node:assert/strict'
import { credentialMethodRequirements, normalizeCredentialMethod } from '../src/lib/credential-method-contract.ts'

const base = { connectionId: 'connection-1', method: 'api_key', keyId: 'key-1', envelopeVersion: 'v1' }
assert.deepEqual(normalizeCredentialMethod(base, 'connection-1'), {
  ok: true,
  descriptor: { ...base, display: 'masked', inputBoundary: 'server', requiresVerification: true },
})
assert.deepEqual(normalizeCredentialMethod({ ...base, method: 'certificate' }), {
  ok: true,
  descriptor: { ...base, method: 'certificate', display: 'masked', inputBoundary: 'server', requiresVerification: true },
})
assert.deepEqual(credentialMethodRequirements('oauth_pkce'), { method: 'oauth_pkce', inputBoundary: 'server', requiresVerification: true, uiLabel: 'OAuth PKCE' })
assert.deepEqual(credentialMethodRequirements('manual_secret'), { method: 'manual_secret', inputBoundary: 'server', requiresVerification: true, uiLabel: 'Manuel credential' })
assert.deepEqual(normalizeCredentialMethod({ ...base, apiKey: 'never-accepted' }), { ok: false, reason: 'secret_forbidden' })
assert.deepEqual(normalizeCredentialMethod({ ...base, certificatePem: 'never-accepted' }), { ok: false, reason: 'secret_forbidden' })
assert.deepEqual(normalizeCredentialMethod({ ...base, unexpected: true }), { ok: false, reason: 'input_invalid' })
assert.deepEqual(normalizeCredentialMethod({ ...base, method: 'unknown' }), { ok: false, reason: 'method_invalid' })
assert.deepEqual(normalizeCredentialMethod({ ...base, keyId: '../key' }), { ok: false, reason: 'key_id_invalid' })
assert.deepEqual(normalizeCredentialMethod({ ...base, envelopeVersion: 'version-1' }), { ok: false, reason: 'version_invalid' })
assert.deepEqual(normalizeCredentialMethod(base, 'connection-2'), { ok: false, reason: 'connection_mismatch' })

console.log('credential-method-contract.test: PASS (R10-V4-16)')
