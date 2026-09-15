import { isPaymentProvider, type PaymentProvider } from '@/lib/payment-provider-contract'
import type { PaymentEventStatus } from '@/lib/payment-state'

const retrieveStatuses: readonly PaymentEventStatus[] = [
  'requires_action',
  'processing',
  'succeeded',
  'failed',
  'canceled',
  'refunded',
  'partially_refunded',
  'disputed',
]
const MAX_AMOUNT_MINOR = 2_147_483_647
const failureCategories = ['configuration', 'not_found', 'rate_limited', 'unavailable', 'unknown'] as const
type RetrieveFailureCategory = (typeof failureCategories)[number]

export type NormalizedProviderRetrieveResult =
  | {
    ok: true
    provider: PaymentProvider
    providerPaymentId: string
    status: PaymentEventStatus
    amountMinor: number
    currency: string
  }
  | { ok: false; provider: PaymentProvider; category: RetrieveFailureCategory; code: string }

function invalidResult(provider: PaymentProvider): NormalizedProviderRetrieveResult {
  return { ok: false, provider, category: 'unknown', code: 'provider_retrieve_response_invalid' }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isProviderPaymentId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{8,255}$/.test(value)
}

function isAmountMinor(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= MAX_AMOUNT_MINOR
}

function isCurrency(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Z]{3}$/.test(value)
}

function isRetrieveStatus(value: unknown): value is PaymentEventStatus {
  return typeof value === 'string' && retrieveStatuses.includes(value as PaymentEventStatus)
}

function isFailureCategory(value: unknown): value is RetrieveFailureCategory {
  return typeof value === 'string' && failureCategories.includes(value as RetrieveFailureCategory)
}

function isSafeCode(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9_-]{1,100}$/.test(value)
}

/** Minimizes provider retrieve output into the internal payment state contract. */
export function normalizeProviderRetrieveResult(provider: unknown, value: unknown): NormalizedProviderRetrieveResult | { ok: false; category: 'configuration'; code: 'provider_invalid' } {
  if (!isPaymentProvider(provider)) return { ok: false, category: 'configuration', code: 'provider_invalid' }
  if (!isRecord(value) || typeof value.ok !== 'boolean') return invalidResult(provider)

  if (value.ok === false) {
    if (!isFailureCategory(value.category) || !isSafeCode(value.code)) return invalidResult(provider)
    return { ok: false, provider, category: value.category, code: value.code }
  }

  const status = value.status
  const currency = typeof value.currency === 'string' ? value.currency.toUpperCase() : value.currency
  if (!isProviderPaymentId(value.providerPaymentId) || !isRetrieveStatus(status) || !isAmountMinor(value.amountMinor) || !isCurrency(currency)) {
    return invalidResult(provider)
  }
  return {
    ok: true,
    provider,
    providerPaymentId: value.providerPaymentId,
    status,
    amountMinor: value.amountMinor,
    currency,
  }
}
