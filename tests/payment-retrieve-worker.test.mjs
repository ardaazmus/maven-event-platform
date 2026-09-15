import assert from 'node:assert'
import { runPaymentRetrieveWorkerAttempt } from '../src/lib/payment-retrieve-worker.ts'

const tx = {
  paymentAttempt: {
    findUnique: async () => ({
      id: 'attempt_123',
      paymentOrderId: 'order_123',
      provider: 'iyzico',
      providerPaymentId: 'token_123456',
      status: 'processing',
      retrieveAttemptCount: 1,
      retrieveLockedUntil: null,
    }),
    updateMany: async () => ({ count: 1 }),
  },
}

const result = await runPaymentRetrieveWorkerAttempt({
  tx,
  adapter: {
    provider: 'iyzico',
    retrievePayment: async () => ({
      ok: true,
      providerPaymentId: 'token_123456',
      status: 'succeeded',
      amountMinor: 12_500,
      currency: 'TRY',
      clientSecret: 'must-not-escape',
    }),
  },
  attemptId: 'attempt_123',
  mode: 'test',
  credentials: { apiKey: 'server-only' },
  order: {
    provider: 'iyzico',
    providerOrderId: 'token_123456',
    amountMinor: 12_500,
    currency: 'TRY',
    status: 'processing',
  },
  nowMs: 10_000,
  workerId: 'worker-1',
  leaseMs: 30_000,
})
assert.deepEqual(result, {
  ok: true,
  job: {
    attemptId: 'attempt_123',
    paymentOrderId: 'order_123',
    provider: 'iyzico',
    providerPaymentId: 'token_123456',
    attemptCount: 2,
    lockedBy: 'worker-1',
    lockedUntilMs: 40_000,
  },
  decision: { ok: true, changed: true, status: 'succeeded' },
})

const failedAdapter = {
  provider: 'iyzico',
  retrievePayment: async () => { throw new Error('must stay internal') },
}
assert.deepEqual(await runPaymentRetrieveWorkerAttempt({
  tx,
  adapter: failedAdapter,
  attemptId: 'attempt_123',
  mode: 'test',
  credentials: { apiKey: 'server-only' },
  order: {
    provider: 'iyzico',
    providerOrderId: 'token_123456',
    amountMinor: 12_500,
    currency: 'TRY',
    status: 'processing',
  },
  nowMs: 10_000,
  workerId: 'worker-1',
}), { ok: false, stage: 'retrieve', category: 'unavailable', code: 'provider_retrieve_adapter_failed' })

console.log('payment-retrieve-worker.test: PASS (PAY-06D-32)')
