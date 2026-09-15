import { applyPaymentRetrieveFailure } from '@/lib/payment-retrieve-failure-persistence'
import { decidePaymentRetrieveFailure } from '@/lib/payment-retrieve-failure'
import { normalizeProviderRetrieveResult } from '@/lib/payment-retrieve-contract'
import { runPaymentRetrieveAdapter } from '@/lib/payment-retrieve-port'
import { applyRetrievedPaymentDecision } from '@/lib/payment-retrieve-reducer'
import type { PaymentRetrieveJob } from '@/lib/payment-retrieve-job'

type TransactionRunner = (callback: (tx: unknown) => Promise<unknown>) => Promise<unknown>
type FailureTransaction = Parameters<typeof applyPaymentRetrieveFailure>[0]
type ReducerTransaction = Parameters<typeof applyRetrievedPaymentDecision>[0]
type FailureCategory = 'configuration' | 'not_found' | 'rate_limited' | 'unavailable' | 'unknown'

export type ClaimedRetrieveExecutionInput = {
  transaction: TransactionRunner
  job: PaymentRetrieveJob
  adapter: unknown
  mode: unknown
  credentials: unknown
  nowMs: number
}

export type ClaimedRetrieveExecutionResult =
  | { ok: true; changed: boolean; status: string }
  | { ok: false; stage: 'retrieve'; category: FailureCategory; code: string; persistence: 'retry' | 'fail' }
  | { ok: false; stage: 'failure_persistence'; reason: 'claim_lost' | 'failure_decision_invalid' }
  | { ok: false; stage: 'reconcile'; reason: string; category?: string; code?: string }

/** Executes one already-claimed retrieve job; provider I/O stays outside DB transactions. */
export async function executeClaimedPaymentRetrieveJob(
  input: ClaimedRetrieveExecutionInput,
): Promise<ClaimedRetrieveExecutionResult> {
  const persistFailure = async (category: FailureCategory, code: string): Promise<ClaimedRetrieveExecutionResult> => {
    const decision = decidePaymentRetrieveFailure({
      attemptCount: input.job.attemptCount,
      category,
      code,
      nowMs: input.nowMs,
    })
    if (decision.action === 'invalid') return { ok: false, stage: 'failure_persistence', reason: 'failure_decision_invalid' }

    const persisted = await input.transaction(tx => applyPaymentRetrieveFailure(tx as FailureTransaction, {
      job: input.job,
      decision,
      nowMs: input.nowMs,
    })) as Awaited<ReturnType<typeof applyPaymentRetrieveFailure>>
    if (!persisted.ok) return { ok: false, stage: 'failure_persistence', reason: persisted.reason }
    return { ok: false, stage: 'retrieve', category, code, persistence: persisted.action }
  }

  const retrieved = await runPaymentRetrieveAdapter(input.adapter, {
    provider: input.job.provider,
    mode: input.mode,
    providerPaymentId: input.job.providerPaymentId,
    credentials: input.credentials,
  })
  if (!retrieved.ok) return persistFailure(retrieved.category, retrieved.code)

  const normalized = normalizeProviderRetrieveResult(input.job.provider, retrieved.raw)
  if (!normalized.ok) return persistFailure(normalized.category, normalized.code)

  const reduced = await input.transaction(tx => applyRetrievedPaymentDecision(tx as ReducerTransaction, {
    job: input.job,
    retrieved: normalized,
    nowMs: input.nowMs,
  })) as Awaited<ReturnType<typeof applyRetrievedPaymentDecision>>
  if (!reduced.ok) {
    if ('category' in reduced && 'code' in reduced) return { ok: false, stage: 'reconcile', reason: reduced.reason, category: reduced.category, code: reduced.code }
    return { ok: false, stage: 'reconcile', reason: reduced.reason }
  }
  return { ok: true, changed: reduced.changed, status: reduced.status }
}
