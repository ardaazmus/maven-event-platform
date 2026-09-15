import assert from 'node:assert'
import { buildPaymentRetrieveWorkerRunSummary } from '../src/lib/payment-retrieve-worker-observability.ts'

assert.deepEqual(buildPaymentRetrieveWorkerRunSummary({
  requested: 10,
  claimed: 3,
  processed: 3,
  startedAtMs: 1_000,
  finishedAtMs: 1_250,
}), {
  status: 'completed',
  requested: 10,
  claimed: 3,
  processed: 3,
  durationMs: 250,
})

assert.equal(buildPaymentRetrieveWorkerRunSummary({
  requested: 10,
  claimed: 3,
  processed: 3,
  startedAtMs: 2_000,
  finishedAtMs: 1_000,
}), null)

assert.equal(buildPaymentRetrieveWorkerRunSummary({
  requested: 51,
  claimed: 1,
  processed: 1,
  startedAtMs: 1_000,
  finishedAtMs: 1_100,
}), null)

console.log('payment-retrieve-worker-observability.test: PASS (PAY-06D-47)')
