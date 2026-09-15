import assert from 'node:assert'
import { evaluateEmailRateLimits, selectTightestEmailRateLimit } from '../src/lib/email-rate-guard.ts'
import { rateLimitDeferData } from '../src/lib/outbox-worker.ts'

const limits = [
  { scope: 'provider', max: 10, windowMs: 10_000 },
  { scope: 'workspace', max: 100, windowMs: 60_000 },
  { scope: 'domain', max: 120, windowMs: 60_000 },
]

assert.deepEqual(selectTightestEmailRateLimit(limits), limits[0], 'provider must be selected when it has the lowest rate')
assert.deepEqual(evaluateEmailRateLimits(limits, [], 1_000), {
  status: 'allowed',
  selectedScope: 'provider',
  remaining: 10,
  retryAt: null,
})

const usage = [{ scope: 'provider', count: 10, windowStartedAt: 1_000 }]
const decision = evaluateEmailRateLimits(limits, usage, 5_000)
assert.deepEqual(decision, {
  status: 'deferred',
  selectedScope: 'provider',
  remaining: 0,
  retryAt: 11_000,
})
assert.deepEqual(usage, [{ scope: 'provider', count: 10, windowStartedAt: 1_000 }], 'rate evaluation must not mutate usage')
assert.throws(() => selectTightestEmailRateLimit([]), /at least one email rate limit/)
assert.throws(() => selectTightestEmailRateLimit([{ scope: 'provider', max: 0, windowMs: 10_000 }]), /invalid email rate limit/)
assert.throws(() => evaluateEmailRateLimits(limits, [{ scope: 'provider', count: -1, windowStartedAt: 1_000 }], 5_000), /invalid email rate usage/)
assert.deepEqual(rateLimitDeferData(11_000, 5_000), {
  status: 'queued',
  availableAt: new Date(11_000),
  lastError: 'email_rate_limited',
  lockedBy: null,
  lockedUntil: null,
})
assert.throws(() => rateLimitDeferData(5_000, 5_000), /retry time must be in the future/)

console.log('email-rate-guard.test: PASS (MAIL-08)')
