import { resolvePaymentRetrieveConnection, type PaymentRetrieveConnectionResolution } from '@/lib/payment-retrieve-connection-resolution'
import { claimNextDuePaymentRetrieveAttempt } from '@/lib/payment-retrieve-scheduler'
import type { PaymentRetrieveJob } from '@/lib/payment-retrieve-job'

type RetrieveTransaction = Parameters<typeof claimNextDuePaymentRetrieveAttempt>[0] & Parameters<typeof resolvePaymentRetrieveConnection>[0]

type PaymentRetrieveWorkerConnectionInput = {
  nowMs: number
  workerId: string
  leaseMs?: number
  env?: NodeJS.ProcessEnv
}

type ConnectionFailureReason = Exclude<PaymentRetrieveConnectionResolution, { ok: true }>['reason']

export type PaymentRetrieveWorkerConnectionResult =
  | { ok: true; job: PaymentRetrieveJob; provider: PaymentRetrieveJob['provider']; mode: 'test' | 'live'; hasCredentials: true; adapter: NonNullable<Extract<PaymentRetrieveConnectionResolution, { ok: true }>['adapter']> }
  | { ok: false; stage: 'claim'; reason: string }
  | { ok: false; stage: 'connection'; reason: ConnectionFailureReason; job: PaymentRetrieveJob }

/** Binds a due retrieve claim to its private connection inside the caller's transaction. */
export async function claimNextDuePaymentRetrieveWithConnection(
  tx: RetrieveTransaction,
  input: PaymentRetrieveWorkerConnectionInput,
): Promise<PaymentRetrieveWorkerConnectionResult> {
  const claimed = await claimNextDuePaymentRetrieveAttempt(tx, input)
  if (!claimed.ok) return { ok: false, stage: 'claim', reason: claimed.reason }

  const resolved = await resolvePaymentRetrieveConnection(tx, { job: claimed.job, env: input.env })
  if (!resolved.ok) return { ok: false, stage: 'connection', reason: resolved.reason, job: claimed.job }
  return {
    ok: true,
    job: claimed.job,
    provider: resolved.provider,
    mode: resolved.mode,
    hasCredentials: resolved.hasCredentials,
    adapter: resolved.adapter,
  }
}
