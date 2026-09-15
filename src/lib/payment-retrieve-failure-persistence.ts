import type { PaymentRetrieveJob } from '@/lib/payment-retrieve-job'
import type { PaymentRetrieveFailureDecision } from '@/lib/payment-retrieve-failure'

type FailureTransaction = {
  paymentAttempt: {
    updateMany(args: {
      where: {
        id: string
        paymentOrderId: string
        provider: string
        providerPaymentId: string
        status: 'processing'
        retrieveLockedBy: string
        retrieveLockedUntil: { gt: Date }
      }
      data: {
        status: 'processing' | 'failed'
        errorCategory: string
        errorCode: string
        retrieveNextAttemptAt: Date | null
        retrieveLockedBy: null
        retrieveLockedUntil: null
      }
    }): Promise<{ count: number }>
  }
}

type PersistFailureInput = {
  job: PaymentRetrieveJob
  decision: Exclude<PaymentRetrieveFailureDecision, { action: 'invalid' }>
  nowMs: number
}

type PersistFailureResult = { ok: true; action: 'retry' | 'fail' } | { ok: false; reason: 'claim_lost' | 'failure_decision_invalid' }

/** Persists a retry/terminal decision only while the worker still owns its lease. */
export async function applyPaymentRetrieveFailure(
  tx: FailureTransaction,
  input: PersistFailureInput,
): Promise<PersistFailureResult> {
  if (input.decision.action !== 'retry' && input.decision.action !== 'fail') {
    return { ok: false, reason: 'failure_decision_invalid' }
  }
  if (input.decision.attemptCount !== input.job.attemptCount) {
    return { ok: false, reason: 'failure_decision_invalid' }
  }
  const result = await tx.paymentAttempt.updateMany({
    where: {
      id: input.job.attemptId,
      paymentOrderId: input.job.paymentOrderId,
      provider: input.job.provider,
      providerPaymentId: input.job.providerPaymentId,
      status: 'processing',
      retrieveLockedBy: input.job.lockedBy,
      retrieveLockedUntil: { gt: new Date(input.nowMs) },
    },
    data: {
      status: input.decision.action === 'retry' ? 'processing' : 'failed',
      errorCategory: input.decision.errorCategory,
      errorCode: input.decision.errorCode,
      retrieveNextAttemptAt: input.decision.action === 'retry' ? new Date(input.decision.retryAtMs) : null,
      retrieveLockedBy: null,
      retrieveLockedUntil: null,
    },
  })
  if (result.count !== 1) return { ok: false, reason: 'claim_lost' }
  return { ok: true, action: input.decision.action }
}
