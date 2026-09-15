import type { PaymentEventStatus } from '@/lib/payment-state'

type StripeFetch = typeof fetch

export type StripeRetrieveFailureCategory = 'configuration' | 'not_found' | 'rate_limited' | 'unavailable' | 'unknown'

export type StripeRetrieveResult =
  | { ok: true; providerPaymentId: string; status: PaymentEventStatus; amountMinor: number; currency: string }
  | { ok: false; category: StripeRetrieveFailureCategory; code: string }

export interface StripeRetrieveInput {
  secretKey: string
  mode: 'test' | 'live'
  paymentIntentId: string
  fetchImpl?: StripeFetch
  timeoutMs?: number
}

const supportedStatuses: Record<string, PaymentEventStatus> = {
  requires_action: 'requires_action',
  processing: 'processing',
  succeeded: 'succeeded',
  canceled: 'canceled',
}

const STRIPE_API_VERSION = '2026-02-25.clover'
const DEFAULT_TIMEOUT_MS = 8_000
const MIN_TIMEOUT_MS = 250
const MAX_TIMEOUT_MS = 30_000

function keyMatchesMode(secretKey: string, mode: StripeRetrieveInput['mode']): boolean {
  return mode === 'test' ? /^(sk|rk)_test_/.test(secretKey) : /^(sk|rk)_live_/.test(secretKey)
}

function httpFailure(status: number): { category: StripeRetrieveFailureCategory; code: string } {
  if (status === 401 || status === 403) return { category: 'configuration', code: 'stripe_authentication_failed' }
  if (status === 404) return { category: 'not_found', code: 'stripe_payment_intent_not_found' }
  if (status === 429) return { category: 'rate_limited', code: 'stripe_rate_limited' }
  if (status >= 500) return { category: 'unavailable', code: 'stripe_unavailable' }
  return { category: 'unknown', code: 'stripe_request_failed' }
}

function safeInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function isValidTimeout(value: number): boolean {
  return Number.isSafeInteger(value) && value >= MIN_TIMEOUT_MS && value <= MAX_TIMEOUT_MS
}

/** Retrieves and minimizes a Stripe PaymentIntent response without exposing raw provider data. */
export async function retrieveStripePayment(input: StripeRetrieveInput): Promise<StripeRetrieveResult> {
  if (!input.secretKey || !keyMatchesMode(input.secretKey, input.mode)) return { ok: false, category: 'configuration', code: 'stripe_key_mode_mismatch' }
  if (!/^pi_[A-Za-z0-9]+$/.test(input.paymentIntentId)) return { ok: false, category: 'configuration', code: 'stripe_payment_intent_id_invalid' }
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS
  if (!isValidTimeout(timeoutMs)) return { ok: false, category: 'configuration', code: 'stripe_timeout_invalid' }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const auth = Buffer.from(`${input.secretKey}:`, 'utf8').toString('base64')
    const response = await (input.fetchImpl ?? fetch)(`https://api.stripe.com/v1/payment_intents/${encodeURIComponent(input.paymentIntentId)}`, {
      method: 'GET',
      redirect: 'error',
      headers: { Accept: 'application/json', Authorization: `Basic ${auth}`, 'Stripe-Version': STRIPE_API_VERSION },
      signal: controller.signal,
    })
    if (!response.ok) return { ok: false, ...httpFailure(response.status) }

    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      return { ok: false, category: 'unknown', code: 'stripe_response_invalid_json' }
    }
    if (!payload || typeof payload !== 'object') return { ok: false, category: 'unknown', code: 'stripe_response_invalid' }
    const record = payload as Record<string, unknown>
    const providerPaymentId = nonEmptyString(record.id)
    const status = nonEmptyString(record.status)
    const amountMinor = safeInteger(record.amount)
    const currency = nonEmptyString(record.currency)?.toUpperCase()
    const normalizedStatus = status ? supportedStatuses[status] : undefined
    if (!providerPaymentId || providerPaymentId !== input.paymentIntentId || !normalizedStatus || amountMinor === null || !currency) {
      return { ok: false, category: 'unknown', code: 'stripe_response_contract_invalid' }
    }
    return { ok: true, providerPaymentId, status: normalizedStatus, amountMinor, currency }
  } catch {
    return { ok: false, category: 'unavailable', code: controller.signal.aborted ? 'stripe_request_timeout' : 'stripe_network_error' }
  } finally {
    clearTimeout(timeout)
  }
}
