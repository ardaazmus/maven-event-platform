import assert from 'node:assert'
import { executeClaimedPaymentRetrieveJob } from '../src/lib/payment-retrieve-claimed-execution.ts'

const job = {
  attemptId: 'attempt_123',
  paymentOrderId: 'order_123',
  provider: 'iyzico',
  providerPaymentId: 'token_123456',
  attemptCount: 1,
  lockedBy: 'worker_123',
  lockedUntilMs: 30_000,
}
const updates = []

const result = await executeClaimedPaymentRetrieveJob({
  transaction: async callback => callback({
    paymentAttempt: {
      updateMany: async args => { updates.push(args); return { count: 1 } },
    },
  }),
  job,
  adapter: { provider: 'iyzico', retrievePayment: async () => ({ ok: false, category: 'unavailable', code: 'provider_unavailable' }) },
  mode: 'test',
  credentials: {},
  nowMs: 10_000,
})

assert.deepEqual(result, { ok: false, stage: 'retrieve', category: 'unavailable', code: 'provider_unavailable', persistence: 'retry' })
assert.equal(updates.length, 1)
assert.equal(updates[0].data.retrieveNextAttemptAt.getTime(), 11_000)

console.log('payment-retrieve-claimed-execution.test: PASS (PAY-06D-44)')
