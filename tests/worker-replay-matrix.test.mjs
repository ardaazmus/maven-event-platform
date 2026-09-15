import assert from 'node:assert/strict'
import { evaluateWorkerReplay } from '../src/lib/worker-replay-matrix.ts'

const base = { attemptCount: 0, maxAttempts: 3, leaseUntilMs: 900, nowMs: 1_000, idempotencyKey: 'job:payment:001', payloadValidated: true }
assert.deepEqual(evaluateWorkerReplay({ ...base, scenario: 'success' }), { ok: true, decision: { scenario: 'success', action: 'ack', retryable: false, terminal: true } })
assert.deepEqual(evaluateWorkerReplay({ ...base, scenario: 'duplicate' }), { ok: true, decision: { scenario: 'duplicate', action: 'deduplicate', retryable: false, terminal: true } })
assert.deepEqual(evaluateWorkerReplay({ ...base, scenario: 'crash' }), { ok: true, decision: { scenario: 'crash', action: 'reclaim', retryable: true, terminal: false } })
assert.deepEqual(evaluateWorkerReplay({ ...base, scenario: 'stale_lease' }), { ok: true, decision: { scenario: 'stale_lease', action: 'reclaim', retryable: true, terminal: false } })
assert.deepEqual(evaluateWorkerReplay({ ...base, scenario: 'retryable_failure' }), { ok: true, decision: { scenario: 'retryable_failure', action: 'retry', retryable: true, terminal: false } })
assert.deepEqual(evaluateWorkerReplay({ ...base, scenario: 'retryable_failure', attemptCount: 3 }), { ok: true, decision: { scenario: 'retryable_failure', action: 'dead_letter', retryable: false, terminal: true } })
assert.deepEqual(evaluateWorkerReplay({ ...base, scenario: 'permanent_failure' }), { ok: true, decision: { scenario: 'permanent_failure', action: 'dead_letter', retryable: false, terminal: true } })
assert.deepEqual(evaluateWorkerReplay({ ...base, scenario: 'unknown', payloadValidated: false }), { ok: true, decision: { scenario: 'unknown', action: 'quarantine', retryable: false, terminal: true } })

assert.deepEqual(evaluateWorkerReplay({ ...base, scenario: 'stale_lease', leaseUntilMs: 1_000 }), { ok: false, reason: 'lease_not_stale' })
assert.deepEqual(evaluateWorkerReplay({ ...base, scenario: 'crash', leaseUntilMs: null }), { ok: false, reason: 'lease_not_stale' })
assert.deepEqual(evaluateWorkerReplay({ ...base, scenario: 'success', idempotencyKey: null }), { ok: false, reason: 'idempotency_required' })
assert.deepEqual(evaluateWorkerReplay({ ...base, scenario: 'success', payloadValidated: false }), { ok: false, reason: 'payload_unvalidated' })
assert.equal(JSON.stringify(evaluateWorkerReplay({ ...base, scenario: 'unknown' })).includes('job:payment:001'), false)

console.log('worker-replay-matrix.test: PASS (R10-V4-37)')
