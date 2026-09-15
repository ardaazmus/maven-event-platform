import { isPaymentProvider, type PaymentProvider } from '@/lib/payment-provider-contract'

const MAX_ATTEMPTS = 5
const MAX_LEASE_MS = 300_000

type PaymentRetrieveAttemptInput = {
  attemptId: unknown
  paymentOrderId: unknown
  provider: unknown
  providerPaymentId: unknown
  status: unknown
  attemptCount: unknown
  lockedUntilMs: unknown
}

type PaymentRetrieveClaimOptions = {
  nowMs: unknown
  workerId: unknown
  leaseMs?: unknown
}

export type PaymentRetrieveJob = {
  attemptId: string
  paymentOrderId: string
  provider: PaymentProvider
  providerPaymentId: string
  attemptCount: number
  lockedBy: string
  lockedUntilMs: number
}

export type PaymentRetrieveClaimResult =
  | { ok: true; job: PaymentRetrieveJob }
  | {
    ok: false
    reason:
      | 'attempt_invalid'
      | 'provider_invalid'
      | 'reference_invalid'
      | 'attempt_not_claimable'
      | 'attempt_locked'
      | 'attempts_exhausted'
      | 'clock_invalid'
      | 'worker_invalid'
      | 'lease_invalid'
  }

function isInternalId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,200}$/.test(value)
}

function isProviderPaymentReference(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{8,255}$/.test(value)
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

/**
 * Creates a provider-neutral retrieve job claim before durable worker wiring.
 * The caller must persist the returned lease atomically with its attempt row.
 */
export function claimPaymentRetrieveAttempt(
  input: PaymentRetrieveAttemptInput,
  options: PaymentRetrieveClaimOptions,
): PaymentRetrieveClaimResult {
  if (!input || typeof input !== 'object') return { ok: false, reason: 'attempt_invalid' }
  if (!isInternalId(input.attemptId) || !isInternalId(input.paymentOrderId)) {
    return { ok: false, reason: 'attempt_invalid' }
  }
  if (!isPaymentProvider(input.provider)) return { ok: false, reason: 'provider_invalid' }
  if (!isProviderPaymentReference(input.providerPaymentId)) {
    return { ok: false, reason: 'reference_invalid' }
  }
  if (input.status !== 'processing') return { ok: false, reason: 'attempt_not_claimable' }
  if (!isNonNegativeSafeInteger(input.attemptCount)) return { ok: false, reason: 'attempt_invalid' }
  if (input.attemptCount >= MAX_ATTEMPTS) return { ok: false, reason: 'attempts_exhausted' }
  if (input.lockedUntilMs !== null && !isNonNegativeSafeInteger(input.lockedUntilMs)) {
    return { ok: false, reason: 'attempt_invalid' }
  }
  if (!isNonNegativeSafeInteger(options.nowMs)) return { ok: false, reason: 'clock_invalid' }
  if (!isInternalId(options.workerId)) return { ok: false, reason: 'worker_invalid' }
  const leaseMs = options.leaseMs === undefined ? 30_000 : options.leaseMs
  if (!isNonNegativeSafeInteger(leaseMs) || leaseMs < 1 || leaseMs > MAX_LEASE_MS) {
    return { ok: false, reason: 'lease_invalid' }
  }
  if (input.lockedUntilMs !== null && input.lockedUntilMs > options.nowMs) {
    return { ok: false, reason: 'attempt_locked' }
  }

  return {
    ok: true,
    job: {
      attemptId: input.attemptId,
      paymentOrderId: input.paymentOrderId,
      provider: input.provider,
      providerPaymentId: input.providerPaymentId,
      attemptCount: input.attemptCount + 1,
      lockedBy: options.workerId,
      lockedUntilMs: options.nowMs + leaseMs,
    },
  }
}
