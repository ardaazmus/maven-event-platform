import { claimPaymentRetrieveAttempt, type PaymentRetrieveClaimResult } from '@/lib/payment-retrieve-job'

type PaymentAttemptRow = {
  id: string
  paymentOrderId: string
  provider: string
  providerPaymentId: string | null
  status: string
  retrieveAttemptCount: number
  retrieveLockedUntil: Date | null
  retrieveNextAttemptAt: Date | null
}

type RetrieveClaimTransaction = {
  paymentAttempt: {
    findUnique(args: {
      where: { id: string }
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
    }): Promise<PaymentAttemptRow | null>
    updateMany(args: {
      where: {
        id: string
        status: 'processing'
        retrieveAttemptCount: { lt: number }
        OR: Array<{ retrieveLockedUntil: null } | { retrieveLockedUntil: { lte: Date } }>
        retrieveNextAttemptAt: Date | null
      }
      data: {
        retrieveAttemptCount: number
        retrieveLockedBy: string
        retrieveLockedUntil: Date
      }
    }): Promise<{ count: number }>
  }
}

type RetrieveClaimInput = { attemptId: string }
type RetrieveClaimOptions = { nowMs: number; workerId: string; leaseMs?: number }

type RetrieveClaimTransactionResult =
  | { ok: true; job: Extract<PaymentRetrieveClaimResult, { ok: true }>['job'] }
  | { ok: false; reason: 'attempt_not_found' | 'claim_lost' | Exclude<Extract<PaymentRetrieveClaimResult, { ok: false }>['reason'], never> }

/** Atomically claims a durable retrieve lease after rechecking its eligibility. */
export async function claimPaymentRetrieveAttemptInTransaction(
  tx: RetrieveClaimTransaction,
  input: RetrieveClaimInput,
  options: RetrieveClaimOptions,
): Promise<RetrieveClaimTransactionResult> {
  const attempt = await tx.paymentAttempt.findUnique({
    where: { id: input.attemptId },
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
  if (!attempt) return { ok: false, reason: 'attempt_not_found' }

  const claim = claimPaymentRetrieveAttempt({
    attemptId: attempt.id,
    paymentOrderId: attempt.paymentOrderId,
    provider: attempt.provider,
    providerPaymentId: attempt.providerPaymentId,
    status: attempt.status,
    attemptCount: attempt.retrieveAttemptCount,
    lockedUntilMs: attempt.retrieveLockedUntil?.getTime() ?? null,
  }, options)
  if (!claim.ok) return claim

  const result = await tx.paymentAttempt.updateMany({
    where: {
      id: attempt.id,
      status: 'processing',
      retrieveAttemptCount: { lt: 5 },
      OR: [
        { retrieveLockedUntil: null },
        { retrieveLockedUntil: { lte: new Date(options.nowMs) } },
      ],
      retrieveNextAttemptAt: attempt.retrieveNextAttemptAt ?? null,
    },
    data: {
      retrieveAttemptCount: claim.job.attemptCount,
      retrieveLockedBy: claim.job.lockedBy,
      retrieveLockedUntil: new Date(claim.job.lockedUntilMs),
    },
  })
  if (result.count !== 1) return { ok: false, reason: 'claim_lost' }
  return claim
}
