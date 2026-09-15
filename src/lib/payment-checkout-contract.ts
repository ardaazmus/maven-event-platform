import { isPaymentProvider, type PaymentProvider } from '@/lib/payment-provider-contract'

export type CheckoutActionStatus = 'open' | 'requires_action' | 'processing'

export type NormalizedCheckoutResult =
  | { ok: true; provider: PaymentProvider; providerReference: string; redirectUrl: string; status: CheckoutActionStatus }
  | { ok: false; category: 'validation' | 'configuration' | 'unavailable' | 'unknown'; code: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function containsForbiddenKeys(value: unknown, depth = 0, seen = new WeakSet<object>()): boolean {
  if (depth > 8) return true
  if (typeof value !== 'object' || value === null) return false
  if (seen.has(value)) return true
  seen.add(value)
  if (Array.isArray(value)) return value.some(item => containsForbiddenKeys(item, depth + 1, seen))
  const record = value as Record<string, unknown>
  const forbiddenKeys = ['secret', 'secretKey', 'apiKey', 'webhookSecret', 'cardNumber', 'cvv', 'cvc', 'pan', 'credentials']
  return Object.entries(record).some(([key, nested]) => forbiddenKeys.includes(key) || containsForbiddenKeys(nested, depth + 1, seen))
}

/** Normalizes provider checkout output before it can cross into the public redirect response. */
export function normalizeProviderCheckoutResult(provider: unknown, value: unknown): NormalizedCheckoutResult {
  if (!isPaymentProvider(provider) || !isRecord(value)) return { ok: false, category: 'unknown', code: 'checkout_response_provider_invalid' }

  if (containsForbiddenKeys(value)) return { ok: false, category: 'unknown', code: 'checkout_response_forbidden' }

  const providerReference = typeof value.providerReference === 'string' ? value.providerReference : ''
  const redirectUrl = typeof value.redirectUrl === 'string' ? value.redirectUrl : ''
  const status = value.status
  if (!/^[A-Za-z0-9:_-]{1,255}$/.test(providerReference) || /[\r\n]/.test(providerReference)) {
    return { ok: false, category: 'validation', code: 'checkout_response_reference_invalid' }
  }
  try {
    const parsedUrl = new URL(redirectUrl)
    if (parsedUrl.protocol !== 'https:') throw new Error('invalid protocol')
  } catch {
    return { ok: false, category: 'validation', code: 'checkout_response_url_invalid' }
  }
  if (status !== 'open' && status !== 'requires_action' && status !== 'processing') {
    return { ok: false, category: 'validation', code: 'checkout_response_status_invalid' }
  }

  return { ok: true, provider, providerReference, redirectUrl, status }
}
