import assert from 'node:assert'
import { runNextDuePaymentRetrieveAttempt } from '../src/lib/payment-retrieve-scheduled-execution.ts'

const attempt = {
  id: 'attempt_123', paymentOrderId: 'order_123', provider: 'iyzico', providerPaymentId: 'token_123456',
  status: 'processing', retrieveAttemptCount: 1, retrieveLockedUntil: null, retrieveNextAttemptAt: null,
}
const jobs = []
const transactions = [
  async callback => callback({
    paymentAttempt: {
      findFirst: async () => attempt,
      findUnique: async () => attempt,
      updateMany: async args => { jobs.push(args); return { count: 1 } },
    },
  }),
  async callback => callback({
    paymentAttempt: {
      updateMany: async args => { jobs.push(args); return { count: 1 } },
    },
  }),
]
const transaction = async callback => transactions.shift()(callback)

assert.deepEqual(await runNextDuePaymentRetrieveAttempt({
  transaction,
  adapter: { provider: 'iyzico', retrievePayment: async () => ({ ok: false, category: 'unavailable', code: 'provider_unavailable' }) },
  mode: 'test', credentials: { apiKey: 'server-only' }, nowMs: 10_000, workerId: 'worker-1', leaseMs: 30_000,
}), {
  ok: false, stage: 'retrieve', category: 'unavailable', code: 'provider_unavailable', persistence: 'retry',
})
assert.equal(jobs.length, 2)
assert.equal(jobs[1].data.retrieveNextAttemptAt.getTime(), 12_000)

let adapterCalls = 0
const emptyResult = await runNextDuePaymentRetrieveAttempt({
  transaction: async callback => callback({ paymentAttempt: { findFirst: async () => null } }),
  adapter: { provider: 'iyzico', retrievePayment: async () => { adapterCalls += 1; return { ok: true } } },
  mode: 'test', credentials: {}, nowMs: 10_000, workerId: 'worker-1',
})
assert.deepEqual(emptyResult, { ok: false, stage: 'claim', reason: 'no_due_attempt' })
assert.equal(adapterCalls, 0)

console.log('payment-retrieve-scheduled-execution.test: PASS (PAY-06D-38)')
