import { executeClaimedPaymentRetrieveJob, type ClaimedRetrieveExecutionResult } from '@/lib/payment-retrieve-claimed-execution'
import { claimNextDuePaymentRetrieveAttempt } from '@/lib/payment-retrieve-scheduler'

type TransactionRunner = (callback: (tx: unknown) => Promise<unknown>) => Promise<unknown>
type SchedulerTransaction = Parameters<typeof claimNextDuePaymentRetrieveAttempt>[0]
type SchedulerResult = Awaited<ReturnType<typeof claimNextDuePaymentRetrieveAttempt>>

type ScheduledRetrieveInput = {
  transaction: TransactionRunner
  adapter: unknown
  mode: unknown
  credentials: unknown
  nowMs: number
  workerId: string
  leaseMs?: number
}

type ScheduledRetrieveResult =
  | { ok: false; stage: 'claim'; reason: string }
  | ClaimedRetrieveExecutionResult

/** Runs one due retrieve job while keeping provider I/O outside database transactions. */
export async function runNextDuePaymentRetrieveAttempt(
  input: ScheduledRetrieveInput,
): Promise<ScheduledRetrieveResult> {
  const claimed = await input.transaction(tx => claimNextDuePaymentRetrieveAttempt(tx as SchedulerTransaction, {
    nowMs: input.nowMs,
    workerId: input.workerId,
    leaseMs: input.leaseMs,
  })) as SchedulerResult
  if (!claimed.ok) return { ok: false, stage: 'claim', reason: claimed.reason }
  return executeClaimedPaymentRetrieveJob({
    transaction: input.transaction,
    job: claimed.job,
    adapter: input.adapter,
    mode: input.mode,
    credentials: input.credentials,
    nowMs: input.nowMs,
  })
}
