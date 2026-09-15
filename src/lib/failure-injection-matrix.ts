import { classifyInvoiceDeliveryFailure } from '@/lib/invoice-delivery-retry'
import { decidePaymentRetrieveFailure } from '@/lib/payment-retrieve-failure'

export const FAILURE_INJECTION_SCENARIOS = Object.freeze([
  'success',
  'timeout',
  'crash',
  'duplicate',
  'stale_lease',
  'permanent',
] as const)

export type FailureInjectionScenario = (typeof FAILURE_INJECTION_SCENARIOS)[number]
export type FailureInjectionDecision = Readonly<{
  scenario: FailureInjectionScenario
  action: 'ack' | 'retry' | 'reclaim' | 'deduplicate' | 'dead_letter'
  retryable: boolean
  terminal: boolean
}>

export type FailureInjectionResult =
  | Readonly<{ ok: true; decision: FailureInjectionDecision }>
  | Readonly<{ ok: false; reason: 'input_invalid' | 'secret_forbidden' | 'scenario_invalid' | 'lease_not_stale' }>

const FORBIDDEN_KEYS = new Set(['secretKey', 'apiKey', 'password', 'credential', 'payload', 'rawPayload', 'providerResponse'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function hasForbiddenKey(value: Record<string, unknown>): boolean {
  return Object.keys(value).some(key => FORBIDDEN_KEYS.has(key))
}

function isScenario(value: unknown): value is FailureInjectionScenario {
  return typeof value === 'string' && (FAILURE_INJECTION_SCENARIOS as readonly string[]).includes(value)
}

function isSafeNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

/** Maps injected worker failures to bounded recovery actions without executing a worker or mutating a queue. */
export function evaluateFailureInjection(input: unknown): FailureInjectionResult {
  if (!isRecord(input)) return { ok: false, reason: 'input_invalid' }
  if (hasForbiddenKey(input)) return { ok: false, reason: 'secret_forbidden' }
  if (Object.keys(input).some(key => !['scenario', 'attemptCount', 'nowMs', 'leaseUntilMs'].includes(key))) {
    return { ok: false, reason: 'input_invalid' }
  }
  if (!isScenario(input.scenario)) return { ok: false, reason: 'scenario_invalid' }
  if (!isSafeNonNegativeInteger(input.attemptCount) || input.attemptCount < 1 || input.attemptCount > 5) {
    return { ok: false, reason: 'input_invalid' }
  }
  if (!isSafeNonNegativeInteger(input.nowMs)) return { ok: false, reason: 'input_invalid' }
  if (input.leaseUntilMs !== undefined && !isSafeNonNegativeInteger(input.leaseUntilMs)) {
    return { ok: false, reason: 'input_invalid' }
  }

  const scenario = input.scenario
  if (scenario === 'success') return { ok: true, decision: { scenario, action: 'ack', retryable: false, terminal: true } }
  if (scenario === 'duplicate') return { ok: true, decision: { scenario, action: 'deduplicate', retryable: false, terminal: true } }
  if (scenario === 'crash') return { ok: true, decision: { scenario, action: 'reclaim', retryable: true, terminal: false } }
  if (scenario === 'stale_lease') {
    if (input.leaseUntilMs === undefined || input.leaseUntilMs >= input.nowMs) return { ok: false, reason: 'lease_not_stale' }
    return { ok: true, decision: { scenario, action: 'reclaim', retryable: true, terminal: false } }
  }
  if (scenario === 'permanent') {
    const delivery = classifyInvoiceDeliveryFailure({ code: 'provider_rejected', attemptCount: input.attemptCount })
    return { ok: true, decision: { scenario, action: delivery.terminal ? 'dead_letter' : 'retry', retryable: !delivery.terminal, terminal: delivery.terminal } }
  }

  const retrieve = decidePaymentRetrieveFailure({ attemptCount: input.attemptCount, category: 'unavailable', code: 'injected_timeout', nowMs: input.nowMs })
  if (retrieve.action === 'invalid') return { ok: false, reason: 'input_invalid' }
  return { ok: true, decision: { scenario, action: retrieve.action === 'retry' ? 'retry' : 'dead_letter', retryable: retrieve.action === 'retry', terminal: retrieve.action === 'fail' } }
}
