import assert from 'node:assert/strict'
import { decryptParasutCredential, encryptParasutCredential, parasutCredentialEnv } from '../src/lib/parasut-credentials.ts'
import { evaluateParasutHealth } from '../src/lib/parasut-health.ts'

const encryptionEnv = {
  [parasutCredentialEnv.key]: Buffer.alloc(32, 7).toString('base64url'),
  [parasutCredentialEnv.keyId]: 'fixture-key-1',
}
const tokenSetFixture = 'access-token-fixture|refresh-token-fixture'
const envelope = encryptParasutCredential(tokenSetFixture, encryptionEnv)

assert.notEqual(envelope, tokenSetFixture)
assert.equal(envelope.split(':').length, 5)
assert.equal(envelope.split(':')[1], 'fixture-key-1')
assert.equal(decryptParasutCredential(envelope, encryptionEnv), tokenSetFixture)
assert.throws(() => decryptParasutCredential(`${envelope.slice(0, -1)}x`, encryptionEnv), /authentication failed/)
assert.throws(
  () => decryptParasutCredential(envelope, { ...encryptionEnv, [parasutCredentialEnv.keyId]: 'old-key' }),
  /key is not active/,
)
assert.throws(() => encryptParasutCredential(tokenSetFixture, {}), /MAVENFORMS_PARASUT_ENCRYPTION_KEY is required/)

const baseHealth = {
  workspaceId: 'workspace-fixture',
  connectionWorkspaceId: 'workspace-fixture',
  selectedCompanyId: 'company-fixture',
}
assert.deepEqual(
  evaluateParasutHealth({
    ...baseHealth,
    provider: { ok: false, kind: 'rate_limited', retryable: true },
  }),
  { status: 'health_check_retryable', canUse: false },
)
assert.deepEqual(
  evaluateParasutHealth({
    ...baseHealth,
    selectedCompanyId: null,
    provider: { ok: true, companyId: 'company-fixture', tokenValid: true },
  }),
  { status: 'company_selection_required', canUse: false },
)
assert.deepEqual(
  evaluateParasutHealth({
    ...baseHealth,
    provider: { ok: true, companyId: 'company-fixture', tokenValid: false },
  }),
  { status: 'reauthorization_required', canUse: false },
)

console.log('v3-parasut-credential-health-gate.test: PASS (provider mutation remains closed)')
