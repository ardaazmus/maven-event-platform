import assert from 'node:assert'
import { encryptPaymentCredential } from '../src/lib/payment-credentials.ts'
import { claimNextDuePaymentRetrieveWithConnection } from '../src/lib/payment-retrieve-worker-connection.ts'

const env = {
  MAVENFORMS_PAYMENT_ENCRYPTION_KEY: Buffer.alloc(32, 9).toString('base64url'),
  MAVENFORMS_PAYMENT_ENCRYPTION_KEY_ID: 'test-key',
}

const envelope = encryptPaymentCredential(JSON.stringify({ secretKey: 'sk_test_example' }), env)
const attempt = {
  id: 'attempt_123',
  paymentOrderId: 'order_123',
  provider: 'stripe',
  providerPaymentId: 'pi_123456',
  status: 'processing',
  retrieveAttemptCount: 0,
  retrieveLockedUntil: null,
  retrieveNextAttemptAt: null,
}

const tx = {
  paymentAttempt: {
    findFirst: async () => attempt,
    findUnique: async args => args.select.paymentOrder
      ? { paymentOrder: { workspaceId: 'workspace_123', provider: 'stripe', mode: 'test' } }
      : attempt,
    updateMany: async () => ({ count: 1 }),
  },
  paymentProviderConnection: {
    findUnique: async () => ({ provider: 'stripe', mode: 'test', status: 'active', credentialsEnvelope: envelope }),
  },
}

const result = await claimNextDuePaymentRetrieveWithConnection(tx, {
  nowMs: 1_000,
  workerId: 'worker_123',
  env,
})
assert.equal(result.ok, true)
if (!result.ok) throw new Error(`unexpected worker connection failure: ${result.reason}`)
assert.deepEqual({ provider: result.provider, mode: result.mode, hasCredentials: result.hasCredentials }, { provider: 'stripe', mode: 'test', hasCredentials: true })
assert.deepEqual(result.job, {
  attemptId: 'attempt_123',
  paymentOrderId: 'order_123',
  provider: 'stripe',
  providerPaymentId: 'pi_123456',
  attemptCount: 1,
  lockedBy: 'worker_123',
  lockedUntilMs: 31_000,
})
assert.equal('credentials' in result, false)
assert.equal(typeof result.adapter.retrievePayment, 'function')

const missingConnection = await claimNextDuePaymentRetrieveWithConnection({
  ...tx,
  paymentProviderConnection: { findUnique: async () => null },
}, { nowMs: 1_000, workerId: 'worker_123', env })
assert.deepEqual(missingConnection, { ok: false, stage: 'connection', reason: 'connection_not_found', job: {
  attemptId: 'attempt_123', paymentOrderId: 'order_123', provider: 'stripe', providerPaymentId: 'pi_123456',
  attemptCount: 1, lockedBy: 'worker_123', lockedUntilMs: 31_000,
} })

console.log('payment-retrieve-worker-connection.test: PASS (PAY-06D-43)')
