import { claimPaymentRetrieveAttemptInTransaction } from '@/lib/payment-retrieve-claim'
import type { PaymentRetrieveJob } from '@/lib/payment-retrieve-job'
import { runPaymentRetrieveAdapter } from '@/lib/payment-retrieve-port'
import { normalizeProviderRetrieveResult } from '@/lib/payment-retrieve-contract'
import { applyRetrievedPaymentDecision } from '@/lib/payment-retrieve-reducer'

type ClaimTransaction = Parameters<typeof claimPaymentRetrieveAttemptInTransaction>[0]
type ReducerTransaction = Parameters<typeof applyRetrievedPaymentDecision>[0]
type ClaimResult = Awaited<ReturnType<typeof claimPaymentRetrieveAttemptInTransaction>>
type TransactionRunner = (callback: (tx: unknown) => Promise<unknown>) => Promise<unknown>

type RetrieveExecutionInput = {
  transaction: TransactionRunner
  adapter: unknown
  attemptId: string
  mode: unknown
  credentials: unknown
  nowMs: number
  workerId: string
  leaseMs?: number
}

type RetrieveExecutionResult =
  | { ok: true; changed: boolean; status: string }
  | { ok: false; stage: 'claim'; reason: string }
  | { ok: false; stage: 'retrieve'; category: 'configuration' | 'not_found' | 'rate_limited' | 'unavailable' | 'unknown'; code: string }
  | { ok: false; stage: 'reconcile'; reason: string; category?: string; code?: string }

/** Executes retrieve I/O outside DB transactions and applies only its safe decision in a later transaction. */
export async function executePaymentRetrieveAttempt(input: RetrieveExecutionInput): Promise<RetrieveExecutionResult> {
  const claimed = await input.transaction(tx => claimPaymentRetrieveAttemptInTransaction(tx as ClaimTransaction, {
    attemptId: input.attemptId,
  }, {
    nowMs: input.nowMs,
    workerId: input.workerId,
    leaseMs: input.leaseMs,
  })) as ClaimResult
  if (!claimed.ok) return { ok: false, stage: 'claim', reason: claimed.reason }

  const retrieved = await runPaymentRetrieveAdapter(input.adapter, {
    provider: claimed.job.provider,
    mode: input.mode,
    providerPaymentId: claimed.job.providerPaymentId,
    credentials: input.credentials,
  })
  if (!retrieved.ok) return { ok: false, stage: 'retrieve', category: retrieved.category, code: retrieved.code }

  const normalized = normalizeProviderRetrieveResult(claimed.job.provider, retrieved.raw)
  if (!normalized.ok) return { ok: false, stage: 'retrieve', category: normalized.category, code: normalized.code }

  const reduced = await input.transaction(tx => applyRetrievedPaymentDecision(tx as ReducerTransaction, {
    job: claimed.job as PaymentRetrieveJob,
    retrieved: normalized,
    nowMs: input.nowMs,
  })) as Awaited<ReturnType<typeof applyRetrievedPaymentDecision>>
  if (!reduced.ok) {
    if ('category' in reduced && 'code' in reduced) return { ok: false, stage: 'reconcile', reason: reduced.reason, category: reduced.category, code: reduced.code }
    return { ok: false, stage: 'reconcile', reason: reduced.reason }
  }
  return { ok: true, changed: reduced.changed, status: reduced.status }
}
