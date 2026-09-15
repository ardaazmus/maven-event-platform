const failureCategories = ['configuration', 'not_found', 'rate_limited', 'unavailable', 'unknown'] as const
type PaymentRetrieveFailureCategory = (typeof failureCategories)[number]
const MAX_ATTEMPTS = 5
const MAX_BACKOFF_MS = 300_000

type PaymentRetrieveFailureInput = {
  attemptCount: unknown
  category: unknown
  code: unknown
  nowMs: unknown
}

export type PaymentRetrieveFailureDecision =
  | {
    action: 'retry'
    attemptCount: number
    retryAtMs: number
    errorCategory: PaymentRetrieveFailureCategory
    errorCode: string
    lockedBy: null
    lockedUntilMs: null
  }
  | {
    action: 'fail'
    attemptCount: number
    errorCategory: PaymentRetrieveFailureCategory
    errorCode: string
    lockedBy: null
    lockedUntilMs: null
  }
  | { action: 'invalid'; reason: 'failure_input_invalid' }

function isFailureCategory(value: unknown): value is PaymentRetrieveFailureCategory {
  return typeof value === 'string' && failureCategories.includes(value as PaymentRetrieveFailureCategory)
}

function isSafeCode(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9_-]{1,100}$/.test(value)
}

function isSafeNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

/** Chooses a bounded retry or terminal failure without mutating payment state. */
export function decidePaymentRetrieveFailure(input: PaymentRetrieveFailureInput): PaymentRetrieveFailureDecision {
  if (!isSafeNonNegativeInteger(input.attemptCount) || input.attemptCount < 1 || input.attemptCount > MAX_ATTEMPTS) {
    return { action: 'invalid', reason: 'failure_input_invalid' }
  }
  if (!isFailureCategory(input.category) || !isSafeCode(input.code) || !isSafeNonNegativeInteger(input.nowMs)) {
    return { action: 'invalid', reason: 'failure_input_invalid' }
  }

  const baseDelay = Math.min(MAX_BACKOFF_MS, 1_000 * 2 ** (input.attemptCount - 1))
  const retryable = input.category === 'rate_limited' || input.category === 'unavailable' || input.category === 'unknown'
  if (!retryable || input.attemptCount >= MAX_ATTEMPTS) {
    return {
      action: 'fail',
      attemptCount: input.attemptCount,
      errorCategory: input.category,
      errorCode: input.code,
      lockedBy: null,
      lockedUntilMs: null,
    }
  }
  if (input.nowMs > Number.MAX_SAFE_INTEGER - baseDelay) return { action: 'invalid', reason: 'failure_input_invalid' }
  return {
    action: 'retry',
    attemptCount: input.attemptCount,
    retryAtMs: input.nowMs + baseDelay,
    errorCategory: input.category,
    errorCode: input.code,
    lockedBy: null,
    lockedUntilMs: null,
  }
}
