import assert from 'node:assert'
import { claimPaymentRetrieveAttemptInTransaction } from '../src/lib/payment-retrieve-claim.ts'

const updates = []
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
    updateMany: async (args) => {
      updates.push(args)
      return { count: 1 }
    },
  },
}

assert.deepEqual(await claimPaymentRetrieveAttemptInTransaction(tx, {
  attemptId: 'attempt_123',
}, { nowMs: 10_000, workerId: 'worker-1', leaseMs: 30_000 }), {
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
})
assert.deepEqual(updates[0], {
  where: {
    id: 'attempt_123',
    status: 'processing',
    retrieveAttemptCount: { lt: 5 },
    OR: [
      { retrieveLockedUntil: null },
      { retrieveLockedUntil: { lte: new Date(10_000) } },
    ],
    retrieveNextAttemptAt: null,
  },
  data: {
    retrieveAttemptCount: 2,
    retrieveLockedBy: 'worker-1',
    retrieveLockedUntil: new Date(40_000),
  },
})

const missingTx = {
  paymentAttempt: {
    findUnique: async () => null,
    updateMany: async () => { throw new Error('must not update a missing attempt') },
  },
}
assert.deepEqual(await claimPaymentRetrieveAttemptInTransaction(missingTx, {
  attemptId: 'attempt_123',
}, { nowMs: 10_000, workerId: 'worker-1' }), { ok: false, reason: 'attempt_not_found' })

const lostTx = {
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
    updateMany: async () => ({ count: 0 }),
  },
}
assert.deepEqual(await claimPaymentRetrieveAttemptInTransaction(lostTx, {
  attemptId: 'attempt_123',
}, { nowMs: 10_000, workerId: 'worker-1' }), { ok: false, reason: 'claim_lost' })

console.log('payment-retrieve-claim-transaction.test: PASS (PAY-06D-28)')
