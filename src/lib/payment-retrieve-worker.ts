import type { PaymentOrderSnapshot } from '@/lib/payment-state'
import { decideRetrievedPaymentTransition } from '@/lib/payment-retrieve-reconciliation'
import { normalizeProviderRetrieveResult } from '@/lib/payment-retrieve-contract'
import { claimPaymentRetrieveAttemptInTransaction } from '@/lib/payment-retrieve-claim'
import { runPaymentRetrieveAdapter } from '@/lib/payment-retrieve-port'

type RetrieveWorkerInput = {
  tx: Parameters<typeof claimPaymentRetrieveAttemptInTransaction>[0]
  adapter: unknown
  attemptId: string
  mode: unknown
  credentials: unknown
  order: PaymentOrderSnapshot
  nowMs: number
  workerId: string
  leaseMs?: number
}

type RetrieveWorkerResult =
  | {
    ok: true
    job: Extract<Awaited<ReturnType<typeof claimPaymentRetrieveAttemptInTransaction>>, { ok: true }>['job']
    decision: { ok: true; changed: boolean; status: PaymentOrderSnapshot['status'] }
  }
  | { ok: false; stage: 'claim'; reason: string }
  | { ok: false; stage: 'retrieve'; category: 'configuration' | 'unavailable'; code: string }
  | { ok: false; stage: 'reconcile'; reason: string; category?: string; code?: string }

/** Runs one claimed retrieve attempt through the internal adapter and decision boundaries. */
export async function runPaymentRetrieveWorkerAttempt(input: RetrieveWorkerInput): Promise<RetrieveWorkerResult> {
  const claim = await claimPaymentRetrieveAttemptInTransaction(input.tx, { attemptId: input.attemptId }, {
    nowMs: input.nowMs,
    workerId: input.workerId,
    leaseMs: input.leaseMs,
  })
  if (!claim.ok) return { ok: false, stage: 'claim', reason: claim.reason }

  const retrieved = await runPaymentRetrieveAdapter(input.adapter, {
    provider: claim.job.provider,
    mode: input.mode,
    providerPaymentId: claim.job.providerPaymentId,
    credentials: input.credentials,
  })
  if (!retrieved.ok) return { ok: false, stage: 'retrieve', category: retrieved.category, code: retrieved.code }

  const normalized = normalizeProviderRetrieveResult(claim.job.provider, retrieved.raw)
  const decision = decideRetrievedPaymentTransition(input.order, normalized)
  if (!decision.ok) return { ok: false, stage: 'reconcile', reason: decision.reason, category: 'category' in decision ? decision.category : undefined, code: 'code' in decision ? decision.code : undefined }
  return { ok: true, job: claim.job, decision }
}
