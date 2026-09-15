import assert from 'node:assert'
import { parseIyzicoCredentialSet } from '../src/lib/iyzico-credentials-contract.ts'

assert.deepEqual(parseIyzicoCredentialSet({ apiKey: 'api-key', secretKey: 'secret-key', webhookSecret: 'webhook-secret' }), {
  ok: true,
  credentials: { apiKey: 'api-key', secretKey: 'secret-key', webhookSecret: 'webhook-secret' },
})

assert.deepEqual(parseIyzicoCredentialSet({ apiKey: 'api-key', secretKey: 'secret-key', credentialsEnvelope: 'must-not-be-forwarded' }), {
  ok: false,
  reason: 'unexpected_field',
})

assert.deepEqual(parseIyzicoCredentialSet({ apiKey: 'api-key\n', secretKey: 'secret-key' }), {
  ok: false,
  reason: 'credential_invalid',
})

console.log('iyzico-credentials-contract.test: PASS (PAY-06D-05)')
