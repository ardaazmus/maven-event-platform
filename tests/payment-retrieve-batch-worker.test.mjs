import assert from 'node:assert'
import { runPaymentRetrieveBatch } from '../src/lib/payment-retrieve-batch-worker.ts'

let calls = 0
const results = await runPaymentRetrieveBatch({
  limit: 2,
  workerId: 'worker-1',
  nowMs: 10_000,
  runNext: async () => {
    calls += 1
    return { ok: true, changed: calls === 1, status: calls === 1 ? 'succeeded' : 'processing' }
  },
})
assert.deepEqual(results, {
  ok: true,
  requested: 2,
  claimed: 2,
  processed: 2,
  results: [
    { ok: true, changed: true, status: 'succeeded' },
    { ok: true, changed: false, status: 'processing' },
  ],
})
assert.equal(calls, 2)

const stopped = await runPaymentRetrieveBatch({
  limit: 50,
  workerId: 'worker-1',
  nowMs: 10_000,
  runNext: async () => ({ ok: false, stage: 'claim', reason: 'no_due_attempt' }),
})
assert.deepEqual(stopped, { ok: true, requested: 50, claimed: 0, processed: 0, results: [] })

const bounded = await runPaymentRetrieveBatch({
  limit: 51,
  workerId: 'worker-1',
  nowMs: 10_000,
  runNext: async () => ({ ok: true, changed: false, status: 'processing' }),
})
assert.deepEqual(bounded, { ok: false, reason: 'invalid_limit' })

console.log('payment-retrieve-batch-worker.test: PASS (PAY-06D-39)')
