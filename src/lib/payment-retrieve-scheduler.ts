import { claimPaymentRetrieveAttemptInTransaction } from '@/lib/payment-retrieve-claim'

type RetrieveClaimTransaction = Parameters<typeof claimPaymentRetrieveAttemptInTransaction>[0]

type ScheduledPaymentAttempt = {
  id: string
  paymentOrderId: string
  provider: string
  providerPaymentId: string | null
  status: string
  retrieveAttemptCount: number
  retrieveLockedUntil: Date | null
  retrieveNextAttemptAt: Date | null
}

type RetrieveSchedulerTransaction = RetrieveClaimTransaction & {
  paymentAttempt: RetrieveClaimTransaction['paymentAttempt'] & {
    findFirst(args: {
      where: {
        status: 'processing'
        AND: Array<{
          OR: Array<
            | { retrieveNextAttemptAt: null | { lte: Date } }
            | { retrieveLockedUntil: null | { lte: Date } }
          >
        }>
      }
      select: {
        id: true
        paymentOrderId: true
        provider: true
        providerPaymentId: true
        status: true
        retrieveAttemptCount: true
        retrieveLockedUntil: true
        retrieveNextAttemptAt: true
      }
    }): Promise<ScheduledPaymentAttempt | null>
  }
}

type RetrieveSchedulerOptions = {
  nowMs: number
  workerId: string
  leaseMs?: number
}

type RetrieveSchedulerResult = Awaited<ReturnType<typeof claimPaymentRetrieveAttemptInTransaction>> | {
  ok: false
  reason: 'no_due_attempt' | 'scheduler_input_invalid'
}

function isSafeTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

/**
 * Selects one due retrieve attempt and rechecks it through the atomic claim.
 * The caller owns the database transaction; no provider request is made here.
 */
export async function claimNextDuePaymentRetrieveAttempt(
  tx: RetrieveSchedulerTransaction,
  options: RetrieveSchedulerOptions,
): Promise<RetrieveSchedulerResult> {
  if (!isSafeTimestamp(options.nowMs)) return { ok: false, reason: 'scheduler_input_invalid' }

  const now = new Date(options.nowMs)
  const attempt = await tx.paymentAttempt.findFirst({
    where: {
      status: 'processing',
      AND: [
        {
          OR: [
            { retrieveNextAttemptAt: null },
            { retrieveNextAttemptAt: { lte: now } },
          ],
        },
        {
          OR: [
            { retrieveLockedUntil: null },
            { retrieveLockedUntil: { lte: now } },
          ],
        },
      ],
    },
    select: {
      id: true,
      paymentOrderId: true,
      provider: true,
      providerPaymentId: true,
      status: true,
      retrieveAttemptCount: true,
      retrieveLockedUntil: true,
      retrieveNextAttemptAt: true,
    },
  })
  if (!attempt) return { ok: false, reason: 'no_due_attempt' }

  return claimPaymentRetrieveAttemptInTransaction(tx, { attemptId: attempt.id }, options)
}
