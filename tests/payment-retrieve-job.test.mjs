import assert from 'node:assert'
import { claimPaymentRetrieveAttempt } from '../src/lib/payment-retrieve-job.ts'

assert.deepEqual(claimPaymentRetrieveAttempt({
  attemptId: 'attempt_123',
  paymentOrderId: 'order_123',
  provider: 'iyzico',
  providerPaymentId: 'token_123456',
  status: 'processing',
  attemptCount: 1,
  lockedUntilMs: null,
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

assert.deepEqual(claimPaymentRetrieveAttempt({
  attemptId: 'attempt_123', paymentOrderId: 'order_123', provider: 'iyzico', providerPaymentId: 'token_123456', status: 'created', attemptCount: 0, lockedUntilMs: null,
}, { nowMs: 10_000, workerId: 'worker-1', leaseMs: 30_000 }), { ok: false, reason: 'attempt_not_claimable' })
assert.deepEqual(claimPaymentRetrieveAttempt({
  attemptId: 'attempt_123', paymentOrderId: 'order_123', provider: 'iyzico', providerPaymentId: 'token_123456', status: 'processing', attemptCount: 0, lockedUntilMs: 20_000,
}, { nowMs: 10_000, workerId: 'worker-1', leaseMs: 30_000 }), { ok: false, reason: 'attempt_locked' })
assert.deepEqual(claimPaymentRetrieveAttempt({
  attemptId: 'attempt_123', paymentOrderId: 'order_123', provider: 'paypal', providerPaymentId: 'token_123456', status: 'processing', attemptCount: 0, lockedUntilMs: null,
}, { nowMs: 10_000, workerId: 'worker-1', leaseMs: 30_000 }), { ok: false, reason: 'provider_invalid' })
assert.deepEqual(claimPaymentRetrieveAttempt({
  attemptId: 'attempt_123', paymentOrderId: 'order_123', provider: 'iyzico', providerPaymentId: 'token_123456', status: 'processing', attemptCount: 5, lockedUntilMs: null,
}, { nowMs: 10_000, workerId: 'worker-1', leaseMs: 30_000 }), { ok: false, reason: 'attempts_exhausted' })

console.log('payment-retrieve-job.test: PASS (PAY-06D-26)')
