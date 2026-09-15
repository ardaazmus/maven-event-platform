import assert from 'node:assert/strict'
import { decidePaymentRetrieveFailure } from '../src/lib/payment-retrieve-failure.ts'
import { applyPaymentRetrieveFailure } from '../src/lib/payment-retrieve-failure-persistence.ts'

const updates = []
const job = {
  attemptId: 'attempt_123',
  paymentOrderId: 'order_123',
  provider: 'stripe',
  providerPaymentId: 'pi_123456',
  attemptCount: 2,
  lockedBy: 'worker_1',
  lockedUntilMs: 30_000,
}

assert.deepEqual(await applyPaymentRetrieveFailure({
  paymentAttempt: {
    updateMany: async args => { updates.push(args); return { count: 1 } },
  },
}, {
  job,
  decision: {
    action: 'fail',
    attemptCount: 1,
    errorCategory: 'configuration',
    errorCode: 'provider_authentication_failed',
    lockedBy: null,
    lockedUntilMs: null,
  },
  nowMs: 10_000,
}), { ok: false, reason: 'failure_decision_invalid' })
assert.equal(updates.length, 0)

assert.deepEqual(decidePaymentRetrieveFailure({
  attemptCount: 1,
  category: 'unavailable',
  code: 'provider_timeout',
  nowMs: 10_000,
}), {
  action: 'retry',
  attemptCount: 1,
  retryAtMs: 11_000,
  errorCategory: 'unavailable',
  errorCode: 'provider_timeout',
  lockedBy: null,
  lockedUntilMs: null,
})

assert.deepEqual(decidePaymentRetrieveFailure({
  attemptCount: 1,
  category: 'not_found',
  code: 'payment_not_found',
  nowMs: 10_000,
}), {
  action: 'fail',
  attemptCount: 1,
  errorCategory: 'not_found',
  errorCode: 'payment_not_found',
  lockedBy: null,
  lockedUntilMs: null,
})

assert.deepEqual(decidePaymentRetrieveFailure({
  attemptCount: 5,
  category: 'rate_limited',
  code: 'provider_rate_limited',
  nowMs: 10_000,
}), {
  action: 'fail',
  attemptCount: 5,
  errorCategory: 'rate_limited',
  errorCode: 'provider_rate_limited',
  lockedBy: null,
  lockedUntilMs: null,
})

updates.length = 0
assert.deepEqual(await applyPaymentRetrieveFailure({
  paymentAttempt: {
    updateMany: async args => { updates.push(args); return { count: 1 } },
  },
}, {
  job,
  decision: {
    action: 'retry',
    attemptCount: 2,
    retryAtMs: 12_000,
    errorCategory: 'unavailable',
    errorCode: 'provider_timeout',
    lockedBy: null,
    lockedUntilMs: null,
  },
  nowMs: 10_000,
}), { ok: true, action: 'retry' })
assert.equal(updates.length, 1)
assert.equal(updates[0].data.status, 'processing')
assert.equal(updates[0].data.retrieveNextAttemptAt.getTime(), 12_000)
assert.equal(updates[0].data.retrieveLockedBy, null)
assert.equal(updates[0].data.retrieveLockedUntil, null)

console.log('v2-payment-retrieve-failure-fence.test: PASS')
