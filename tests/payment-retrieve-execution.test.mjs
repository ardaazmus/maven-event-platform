import assert from 'node:assert'
import { executePaymentRetrieveAttempt } from '../src/lib/payment-retrieve-execution.ts'

let transactionCount = 0
const transaction = async callback => {
  transactionCount += 1
  return callback({
    paymentAttempt: {
      findUnique: async () => ({
        id: 'attempt_123', paymentOrderId: 'order_123', provider: 'iyzico', providerPaymentId: 'token_123456',
        status: 'processing', retrieveAttemptCount: 1, retrieveLockedUntil: null,
      }),
      updateMany: async () => ({ count: 1 }),
    },
    paymentOrder: {
      findUnique: async () => ({
        id: 'order_123', provider: 'iyzico', providerOrderId: 'token_123456', amountMinor: 12_500, currency: 'TRY', status: 'processing',
      }),
      update: async () => ({}),
    },
  })
}

assert.deepEqual(await executePaymentRetrieveAttempt({
  transaction,
  adapter: {
    provider: 'iyzico',
    retrievePayment: async () => ({
      ok: true, providerPaymentId: 'token_123456', status: 'succeeded', amountMinor: 12_500, currency: 'TRY',
      clientSecret: 'must-not-escape',
    }),
  },
  attemptId: 'attempt_123',
  mode: 'test',
  credentials: { apiKey: 'server-only' },
  order: { provider: 'iyzico', providerOrderId: 'token_123456', amountMinor: 12_500, currency: 'TRY', status: 'processing' },
  nowMs: 10_000,
  workerId: 'worker-1',
  leaseMs: 30_000,
}), { ok: true, changed: true, status: 'succeeded' })
assert.equal(transactionCount, 2)

let failedTransactionCount = 0
assert.deepEqual(await executePaymentRetrieveAttempt({
  transaction: async callback => {
    failedTransactionCount += 1
    return callback({
      paymentAttempt: {
        findUnique: async () => ({
          id: 'attempt_123', paymentOrderId: 'order_123', provider: 'iyzico', providerPaymentId: 'token_123456',
          status: 'processing', retrieveAttemptCount: 1, retrieveLockedUntil: null,
        }),
        updateMany: async () => ({ count: 1 }),
      },
    })
  },
  adapter: { provider: 'iyzico', retrievePayment: async () => ({ ok: false, category: 'not_found', code: 'payment_not_found' }) },
  attemptId: 'attempt_123', mode: 'test', credentials: {},
  order: { provider: 'iyzico', providerOrderId: 'token_123456', amountMinor: 12_500, currency: 'TRY', status: 'processing' },
  nowMs: 10_000, workerId: 'worker-1',
}), { ok: false, stage: 'retrieve', category: 'not_found', code: 'payment_not_found' })
assert.equal(failedTransactionCount, 1)

console.log('payment-retrieve-execution.test: PASS (PAY-06D-34)')
