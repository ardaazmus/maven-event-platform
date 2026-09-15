import assert from 'node:assert'
import { decidePaymentRetrieveFailure } from '../src/lib/payment-retrieve-failure.ts'

assert.deepEqual(decidePaymentRetrieveFailure({
  attemptCount: 1,
  category: 'unavailable',
  code: 'provider_unavailable',
  nowMs: 10_000,
}), {
  action: 'retry',
  attemptCount: 1,
  retryAtMs: 11_000,
  errorCategory: 'unavailable',
  errorCode: 'provider_unavailable',
  lockedBy: null,
  lockedUntilMs: null,
})

assert.deepEqual(decidePaymentRetrieveFailure({
  attemptCount: 3,
  category: 'rate_limited',
  code: 'provider_rate_limited',
  nowMs: 10_000,
}), {
  action: 'retry',
  attemptCount: 3,
  retryAtMs: 14_000,
  errorCategory: 'rate_limited',
  errorCode: 'provider_rate_limited',
  lockedBy: null,
  lockedUntilMs: null,
})

assert.deepEqual(decidePaymentRetrieveFailure({
  attemptCount: 5,
  category: 'unavailable',
  code: 'provider_unavailable',
  nowMs: 10_000,
}), {
  action: 'fail',
  attemptCount: 5,
  errorCategory: 'unavailable',
  errorCode: 'provider_unavailable',
  lockedBy: null,
  lockedUntilMs: null,
})

assert.deepEqual(decidePaymentRetrieveFailure({
  attemptCount: 1,
  category: 'configuration',
  code: 'provider_authentication_failed',
  nowMs: 10_000,
}), {
  action: 'fail',
  attemptCount: 1,
  errorCategory: 'configuration',
  errorCode: 'provider_authentication_failed',
  lockedBy: null,
  lockedUntilMs: null,
})

for (const input of [
  { attemptCount: 0, category: 'unavailable', code: 'provider_unavailable', nowMs: 10_000 },
  { attemptCount: 1, category: 'unknown', code: 'bad code', nowMs: 10_000 },
  { attemptCount: 1, category: 'unavailable', code: 'provider_unavailable', nowMs: -1 },
]) {
  assert.deepEqual(decidePaymentRetrieveFailure(input), { action: 'invalid', reason: 'failure_input_invalid' })
}

console.log('payment-retrieve-failure.test: PASS (PAY-06D-35)')
