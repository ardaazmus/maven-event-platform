import assert from 'node:assert'
import { encryptPaymentCredential } from '../src/lib/payment-credentials.ts'
import { resolvePaymentRetrieveConnection } from '../src/lib/payment-retrieve-connection-resolution.ts'

const env = {
  MAVENFORMS_PAYMENT_ENCRYPTION_KEY: Buffer.alloc(32, 8).toString('base64url'),
  MAVENFORMS_PAYMENT_ENCRYPTION_KEY_ID: 'test-key',
}

const job = {
  attemptId: 'attempt_123',
  paymentOrderId: 'order_123',
  provider: 'stripe',
  providerPaymentId: 'pi_123456',
  attemptCount: 1,
  lockedBy: 'worker_123',
  lockedUntilMs: Date.now() + 30_000,
}

function transaction(connection, mode = 'test') {
  return {
    paymentAttempt: {
      findUnique: async () => ({ paymentOrder: { workspaceId: 'workspace_123', provider: 'stripe', mode } }),
    },
    paymentProviderConnection: {
      findUnique: async () => connection,
    },
  }
}

const envelope = encryptPaymentCredential(JSON.stringify({ secretKey: 'sk_test_example' }), env)
const resolved = await resolvePaymentRetrieveConnection(transaction({ provider: 'stripe', mode: 'test', status: 'active', credentialsEnvelope: envelope }), { job, env })
assert.equal(resolved.ok, true)
if (!resolved.ok) throw new Error(`unexpected resolution failure: ${resolved.reason}`)
assert.deepEqual({ provider: resolved.provider, mode: resolved.mode, hasCredentials: resolved.hasCredentials }, { provider: 'stripe', mode: 'test', hasCredentials: true })
assert.equal('credentials' in resolved, false)
assert.equal(typeof resolved.adapter.retrievePayment, 'function')

assert.deepEqual(
  await resolvePaymentRetrieveConnection(transaction({ provider: 'stripe', mode: 'test', status: 'pending_verification', credentialsEnvelope: envelope }), { job, env }),
  { ok: false, reason: 'connection_not_active' },
)
assert.deepEqual(
  await resolvePaymentRetrieveConnection(transaction({ provider: 'stripe', mode: 'live', status: 'active', credentialsEnvelope: envelope }, 'live'), { job, env }),
  { ok: false, reason: 'live_disabled' },
)
assert.deepEqual(
  await resolvePaymentRetrieveConnection(transaction(null), { job, env }),
  { ok: false, reason: 'connection_not_found' },
)

console.log('payment-retrieve-connection-resolution.test: PASS (PAY-06D-53)')
