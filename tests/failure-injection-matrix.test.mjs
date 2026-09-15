import assert from 'node:assert/strict'
import { evaluateFailureInjection } from '../src/lib/failure-injection-matrix.ts'

const base = { attemptCount: 1, nowMs: 1_700_000_000_000 }
assert.deepEqual(evaluateFailureInjection({ ...base, scenario: 'success' }), { ok: true, decision: { scenario: 'success', action: 'ack', retryable: false, terminal: true } })
assert.deepEqual(evaluateFailureInjection({ ...base, scenario: 'duplicate' }), { ok: true, decision: { scenario: 'duplicate', action: 'deduplicate', retryable: false, terminal: true } })
assert.deepEqual(evaluateFailureInjection({ ...base, scenario: 'crash' }), { ok: true, decision: { scenario: 'crash', action: 'reclaim', retryable: true, terminal: false } })
assert.deepEqual(evaluateFailureInjection({ ...base, scenario: 'stale_lease', leaseUntilMs: base.nowMs - 1 }), { ok: true, decision: { scenario: 'stale_lease', action: 'reclaim', retryable: true, terminal: false } })
assert.deepEqual(evaluateFailureInjection({ ...base, scenario: 'stale_lease', leaseUntilMs: base.nowMs }), { ok: false, reason: 'lease_not_stale' })
assert.deepEqual(evaluateFailureInjection({ ...base, scenario: 'timeout' }), { ok: true, decision: { scenario: 'timeout', action: 'retry', retryable: true, terminal: false } })
assert.deepEqual(evaluateFailureInjection({ ...base, attemptCount: 5, scenario: 'timeout' }), { ok: true, decision: { scenario: 'timeout', action: 'dead_letter', retryable: false, terminal: true } })
assert.deepEqual(evaluateFailureInjection({ ...base, scenario: 'permanent' }), { ok: true, decision: { scenario: 'permanent', action: 'dead_letter', retryable: false, terminal: true } })
assert.deepEqual(evaluateFailureInjection({ ...base, scenario: 'unknown' }), { ok: false, reason: 'scenario_invalid' })
assert.deepEqual(evaluateFailureInjection({ ...base, scenario: 'timeout', attemptCount: 0 }), { ok: false, reason: 'input_invalid' })
assert.deepEqual(evaluateFailureInjection({ ...base, scenario: 'timeout', apiKey: 'never-accepted' }), { ok: false, reason: 'secret_forbidden' })
assert.deepEqual(evaluateFailureInjection({ ...base, scenario: 'timeout', rawPayload: '{}' }), { ok: false, reason: 'secret_forbidden' })

const source = await Bun.file('src/lib/failure-injection-matrix.ts').text()
assert.equal(source.includes('fetch('), false)
assert.equal(source.includes('db.'), false)

console.log('failure-injection-matrix.test: PASS (R10-V4-21)')
