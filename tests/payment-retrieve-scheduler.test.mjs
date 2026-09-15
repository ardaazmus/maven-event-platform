import assert from 'node:assert'
import { claimNextDuePaymentRetrieveAttempt } from '../src/lib/payment-retrieve-scheduler.ts'

const queries = []
const attempt = {
  id: 'attempt_123', paymentOrderId: 'order_123', provider: 'iyzico', providerPaymentId: 'token_123456',
  status: 'processing', retrieveAttemptCount: 1, retrieveLockedUntil: null, retrieveNextAttemptAt: new Date(1_000),
}
const tx = {
  paymentAttempt: {
    findFirst: async args => { queries.push(args); return attempt },
    findUnique: async () => attempt,
    updateMany: async () => ({ count: 1 }),
  },
}

assert.deepEqual(await claimNextDuePaymentRetrieveAttempt(tx, {
  nowMs: 10_000, workerId: 'worker-1', leaseMs: 30_000,
}), {
  ok: true,
  job: {
    attemptId: 'attempt_123', paymentOrderId: 'order_123', provider: 'iyzico', providerPaymentId: 'token_123456',
    attemptCount: 2, lockedBy: 'worker-1', lockedUntilMs: 40_000,
  },
})
assert.deepEqual(queries[0].where, {
  status: 'processing',
  AND: [
    { OR: [{ retrieveNextAttemptAt: null }, { retrieveNextAttemptAt: { lte: new Date(10_000) } }] },
    { OR: [{ retrieveLockedUntil: null }, { retrieveLockedUntil: { lte: new Date(10_000) } }] },
  ],
})

const emptyTx = { paymentAttempt: { findFirst: async () => null, findUnique: async () => null, updateMany: async () => ({ count: 0 }) } }
assert.deepEqual(await claimNextDuePaymentRetrieveAttempt(emptyTx, {
  nowMs: 10_000, workerId: 'worker-1', leaseMs: 30_000,
}), { ok: false, reason: 'no_due_attempt' })

const lostTx = {
  paymentAttempt: {
    findFirst: async () => attempt,
    findUnique: async () => attempt,
    updateMany: async () => ({ count: 0 }),
  },
}
assert.deepEqual(await claimNextDuePaymentRetrieveAttempt(lostTx, {
  nowMs: 10_000, workerId: 'worker-1', leaseMs: 30_000,
}), { ok: false, reason: 'claim_lost' })

console.log('payment-retrieve-scheduler.test: PASS (PAY-06D-37)')
