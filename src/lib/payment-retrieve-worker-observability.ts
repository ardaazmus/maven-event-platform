import { MAX_INTERNAL_WORKER_BATCH_SIZE } from '@/lib/internal-worker-auth'

type PaymentRetrieveWorkerRunInput = {
  requested: unknown
  claimed: unknown
  processed: unknown
  startedAtMs: unknown
  finishedAtMs: unknown
}

export type PaymentRetrieveWorkerRunSummary = {
  status: 'completed'
  requested: number
  claimed: number
  processed: number
  durationMs: number
}

function isSafeNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

/** Builds a bounded worker metric summary without identifiers, credentials, provider payloads, or recipient data. */
export function buildPaymentRetrieveWorkerRunSummary(input: PaymentRetrieveWorkerRunInput): PaymentRetrieveWorkerRunSummary | null {
  if (!isSafeNonNegativeInteger(input.requested) || input.requested < 1 || input.requested > MAX_INTERNAL_WORKER_BATCH_SIZE) return null
  if (!isSafeNonNegativeInteger(input.claimed) || input.claimed > input.requested) return null
  if (!isSafeNonNegativeInteger(input.processed) || input.processed > input.claimed) return null
  if (!isSafeNonNegativeInteger(input.startedAtMs) || !isSafeNonNegativeInteger(input.finishedAtMs) || input.finishedAtMs < input.startedAtMs) return null
  return {
    status: 'completed',
    requested: input.requested,
    claimed: input.claimed,
    processed: input.processed,
    durationMs: input.finishedAtMs - input.startedAtMs,
  }
}
