import { executeClaimedPaymentRetrieveJob, type ClaimedRetrieveExecutionResult } from '@/lib/payment-retrieve-claimed-execution'
import { applyPaymentRetrieveFailure } from '@/lib/payment-retrieve-failure-persistence'
import { decidePaymentRetrieveFailure } from '@/lib/payment-retrieve-failure'
import { claimNextDuePaymentRetrieveWithConnection } from '@/lib/payment-retrieve-worker-connection'

type TransactionRunner = (callback: (tx: unknown) => Promise<unknown>) => Promise<unknown>
type ConnectionTransaction = Parameters<typeof claimNextDuePaymentRetrieveWithConnection>[0]
type BoundResult = Awaited<ReturnType<typeof claimNextDuePaymentRetrieveWithConnection>>
type BoundConnectionFailure = Extract<BoundResult, { ok: false; stage: 'connection' }>
type FailureTransaction = Parameters<typeof applyPaymentRetrieveFailure>[0]

type DatabaseRetrieveWorkerInput = {
  transaction: TransactionRunner
  nowMs: number
  workerId: string
  leaseMs?: number
  env?: NodeJS.ProcessEnv
}

export type DatabaseRetrieveWorkerResult =
  | { ok: false; stage: 'claim'; reason: string }
  | { ok: false; stage: 'connection'; reason: BoundConnectionFailure['reason']; persistence: 'fail' }
  | { ok: false; stage: 'failure_persistence'; reason: 'claim_lost' | 'failure_decision_invalid' }
  | ClaimedRetrieveExecutionResult

const connectionFailureCodes: Record<BoundConnectionFailure['reason'], string> = {
  attempt_not_found: 'payment_attempt_not_found',
  connection_not_found: 'payment_connection_not_found',
  connection_mismatch: 'payment_connection_mismatch',
  connection_not_active: 'payment_connection_not_active',
  credentials_missing: 'payment_credentials_missing',
  credentials_invalid: 'payment_credentials_invalid',
  adapter_unavailable: 'payment_adapter_unavailable',
  live_disabled: 'payment_live_disabled',
}

/** Runs one due retrieve job using only its transaction-bound private provider connection. */
export async function runNextDuePaymentRetrieveFromDatabase(
  input: DatabaseRetrieveWorkerInput,
): Promise<DatabaseRetrieveWorkerResult> {
  const bound = await input.transaction(tx => claimNextDuePaymentRetrieveWithConnection(tx as ConnectionTransaction, {
    nowMs: input.nowMs,
    workerId: input.workerId,
    leaseMs: input.leaseMs,
    env: input.env,
  })) as BoundResult
  if (!bound.ok) {
    if (bound.stage === 'claim') return bound
    const decision = decidePaymentRetrieveFailure({
      attemptCount: bound.job.attemptCount,
      category: 'configuration',
      code: connectionFailureCodes[bound.reason],
      nowMs: input.nowMs,
    })
    if (decision.action === 'invalid') return { ok: false, stage: 'failure_persistence', reason: 'failure_decision_invalid' }
    const persisted = await input.transaction(tx => applyPaymentRetrieveFailure(tx as FailureTransaction, {
      job: bound.job,
      decision,
      nowMs: input.nowMs,
    })) as Awaited<ReturnType<typeof applyPaymentRetrieveFailure>>
    if (!persisted.ok) return { ok: false, stage: 'failure_persistence', reason: persisted.reason }
    if (persisted.action !== 'fail') return { ok: false, stage: 'failure_persistence', reason: 'failure_decision_invalid' }
    return { ok: false, stage: 'connection', reason: bound.reason, persistence: 'fail' }
  }

  return executeClaimedPaymentRetrieveJob({
    transaction: input.transaction,
    job: bound.job,
    adapter: bound.adapter,
    mode: bound.mode,
    credentials: {},
    nowMs: input.nowMs,
  })
}
