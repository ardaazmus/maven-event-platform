import {
  normalizeProviderFailure,
  type PaymentFailureCategory,
  type PaymentProvider,
} from '@/lib/payment-provider-contract'

export const FAKE_PROVIDER_SCENARIOS = Object.freeze([
  'success',
  'timeout',
  'rate_limited',
  'server_error',
] as const)

export type FakeProviderScenario = (typeof FAKE_PROVIDER_SCENARIOS)[number]

type FakeProviderInput = Readonly<{
  provider: PaymentProvider
  requestId: string
  scenario: FakeProviderScenario
}>

type FakeProviderSuccess = Readonly<{
  ok: true
  provider: PaymentProvider
  requestId: string
  scenario: 'success'
  status: 'accepted'
  providerReference: string
  retryable: false
}>

type FakeProviderFailure = Readonly<{
  ok: false
  provider: PaymentProvider
  requestId: string
  scenario: Exclude<FakeProviderScenario, 'success'>
  category: PaymentFailureCategory
  providerStatus: 429 | 503 | null
  retryable: true
}>

type FakeProviderRejection = Readonly<{
  ok: false
  reason: 'input_invalid' | 'secret_forbidden' | 'scenario_invalid'
}>

export type FakeProviderResult = FakeProviderSuccess | FakeProviderFailure | FakeProviderRejection

const SAFE_ID_PATTERN = /^[A-Za-z0-9._-]{1,120}$/
const FORBIDDEN_KEYS = new Set([
  'secretKey',
  'apiKey',
  'api_key',
  'webhookSecret',
  'password',
  'privateKey',
  'private_key',
  'cardNumber',
  'cvv',
  'cvc',
  'pan',
  'payload',
  'rawResponse',
  'providerResponse',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function hasForbiddenKey(value: Record<string, unknown>): boolean {
  return Object.keys(value).some((key) => FORBIDDEN_KEYS.has(key))
}

function isScenario(value: unknown): value is FakeProviderScenario {
  return typeof value === 'string'
    && (FAKE_PROVIDER_SCENARIOS as readonly string[]).includes(value)
}

/**
 * Produces deterministic provider outcomes for local contract and UI tests.
 * It intentionally has no network, credential, persistence, or raw-provider boundary.
 */
export function runFakeProvider(input: unknown): FakeProviderResult {
  if (!isRecord(input)) return { ok: false, reason: 'input_invalid' }
  if (hasForbiddenKey(input)) return { ok: false, reason: 'secret_forbidden' }

  const keys = Object.keys(input).sort()
  if (keys.join(',') !== 'provider,requestId,scenario') return { ok: false, reason: 'input_invalid' }
  if (input.provider !== 'stripe' && input.provider !== 'iyzico') return { ok: false, reason: 'input_invalid' }
  if (typeof input.requestId !== 'string' || !SAFE_ID_PATTERN.test(input.requestId)) {
    return { ok: false, reason: 'input_invalid' }
  }
  if (!isScenario(input.scenario)) return { ok: false, reason: 'scenario_invalid' }

  const request = input as FakeProviderInput
  if (request.scenario === 'success') {
    return {
      ok: true,
      provider: request.provider,
      requestId: request.requestId,
      scenario: request.scenario,
      status: 'accepted',
      providerReference: `fake-${request.provider}-${request.requestId}`,
      retryable: false,
    }
  }

  const providerStatus = request.scenario === 'timeout'
    ? null
    : request.scenario === 'rate_limited' ? 429 : 503
  const category = normalizeProviderFailure(
    request.scenario === 'rate_limited' ? 'rate_limited' : 'unavailable',
  )
  return {
    ok: false,
    provider: request.provider,
    requestId: request.requestId,
    scenario: request.scenario,
    category,
    providerStatus,
    retryable: true,
  }
}
