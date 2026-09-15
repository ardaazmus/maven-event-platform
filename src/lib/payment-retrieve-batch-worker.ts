import { MAX_INTERNAL_WORKER_BATCH_SIZE } from '@/lib/internal-worker-auth'

type BatchFailureCategory = 'configuration' | 'not_found' | 'rate_limited' | 'unavailable' | 'unknown'

export type PaymentRetrieveBatchItem =
  | { ok: true; changed: boolean; status: string }
  | { ok: false; stage: 'claim'; reason: string }
  | { ok: false; stage: 'retrieve'; category: BatchFailureCategory; code: string; persistence: 'retry' | 'fail' }
  | { ok: false; stage: 'failure_persistence'; reason: 'claim_lost' | 'failure_decision_invalid' }
  | { ok: false; stage: 'reconcile'; reason: string; category?: string; code?: string }

type PaymentRetrieveBatchInput = {
  limit: number
  workerId: string
  nowMs: number
  runNext: (input: { workerId: string; nowMs: number }) => Promise<PaymentRetrieveBatchItem>
}

export type PaymentRetrieveBatchResult =
  | { ok: true; requested: number; claimed: number; processed: number; results: PaymentRetrieveBatchItem[] }
  | { ok: false; reason: 'invalid_limit' }

/** Runs a bounded number of already-authenticated retrieve jobs and stops when none are due. */
export async function runPaymentRetrieveBatch(
  input: PaymentRetrieveBatchInput,
): Promise<PaymentRetrieveBatchResult> {
  if (!Number.isSafeInteger(input.limit) || input.limit < 1 || input.limit > MAX_INTERNAL_WORKER_BATCH_SIZE) {
    return { ok: false, reason: 'invalid_limit' }
  }

  const results: PaymentRetrieveBatchItem[] = []
  let claimed = 0
  for (let index = 0; index < input.limit; index += 1) {
    const result = await input.runNext({ workerId: input.workerId, nowMs: input.nowMs })
    if (!result.ok && result.stage === 'claim' && result.reason === 'no_due_attempt') break
    claimed += 1
    results.push(result)
  }

  return { ok: true, requested: input.limit, claimed, processed: results.length, results }
}
