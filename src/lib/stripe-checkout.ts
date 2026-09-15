export type StripeCheckoutFailureCategory = 'configuration' | 'validation' | 'rate_limited' | 'unavailable' | 'unknown'

export type StripeCheckoutResult =
  | { ok: true; sessionId: string; url: string; status: 'open' }
  | { ok: false; category: StripeCheckoutFailureCategory; code: string }

export interface StripeCheckoutInput {
  secretKey: string
  mode: 'test' | 'live'
  idempotencyKey: string
  amountMinor: number
  currency: string
  productName: string
  successUrl: string
  cancelUrl: string
  metadata?: Record<string, string>
  fetchImpl?: typeof fetch
  timeoutMs?: number
}

const STRIPE_API_VERSION = '2026-02-25.clover'
const MAX_AMOUNT_MINOR = 2_147_483_647

function keyMatchesMode(secretKey: string, mode: StripeCheckoutInput['mode']): boolean {
  return mode === 'test' ? /^(sk|rk)_test_/.test(secretKey) : /^(sk|rk)_live_/.test(secretKey)
}

function validUrl(value: string, mode: StripeCheckoutInput['mode']): boolean {
  try {
    const url = new URL(value)
    if (url.protocol === 'https:') return true
    return mode === 'test' && url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)
  } catch {
    return false
  }
}

function normalizeCurrency(value: string): string | null {
  const currency = value.trim().toLowerCase()
  return /^[a-z]{3}$/.test(currency) ? currency : null
}

function httpFailure(status: number): { category: StripeCheckoutFailureCategory; code: string } {
  if (status === 400 || status === 401 || status === 403) return { category: 'configuration', code: 'stripe_checkout_request_rejected' }
  if (status === 409) return { category: 'validation', code: 'stripe_checkout_idempotency_conflict' }
  if (status === 429) return { category: 'rate_limited', code: 'stripe_rate_limited' }
  if (status >= 500) return { category: 'unavailable', code: 'stripe_unavailable' }
  return { category: 'unknown', code: 'stripe_checkout_request_failed' }
}

function safeMetadata(metadata: Record<string, string> | undefined): Record<string, string> | null {
  if (!metadata) return {}
  const entries = Object.entries(metadata)
  if (entries.length > 20 || entries.some(([key, value]) => !/^[a-zA-Z0-9_.-]{1,40}$/.test(key) || value.length > 500 || /[\r\n]/.test(value))) return null
  return Object.fromEntries(entries)
}

/** Creates a minimized Stripe-hosted Checkout Session; card data never enters MavenForms. */
export async function createStripeCheckoutSession(input: StripeCheckoutInput): Promise<StripeCheckoutResult> {
  const currency = normalizeCurrency(input.currency)
  const metadata = safeMetadata(input.metadata)
  if (!keyMatchesMode(input.secretKey, input.mode)) return { ok: false, category: 'configuration', code: 'stripe_key_mode_mismatch' }
  if (!currency || !Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0 || input.amountMinor > MAX_AMOUNT_MINOR) return { ok: false, category: 'validation', code: 'stripe_checkout_amount_invalid' }
  if (!input.productName.trim() || input.productName.length > 200) return { ok: false, category: 'validation', code: 'stripe_checkout_product_invalid' }
  if (!/^[A-Za-z0-9:_-]{16,255}$/.test(input.idempotencyKey)) return { ok: false, category: 'validation', code: 'stripe_checkout_idempotency_key_invalid' }
  if (!validUrl(input.successUrl, input.mode) || !validUrl(input.cancelUrl, input.mode)) return { ok: false, category: 'validation', code: 'stripe_checkout_url_invalid' }
  if (!metadata) return { ok: false, category: 'validation', code: 'stripe_checkout_metadata_invalid' }

  const params = new URLSearchParams({
    mode: 'payment',
    'line_items[0][price_data][currency]': currency,
    'line_items[0][price_data][product_data][name]': input.productName.trim(),
    'line_items[0][price_data][unit_amount]': String(input.amountMinor),
    'line_items[0][quantity]': '1',
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
  })
  for (const [key, value] of Object.entries(metadata)) params.set(`metadata[${key}]`, value)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? 8_000)
  try {
    const auth = Buffer.from(`${input.secretKey}:`, 'utf8').toString('base64')
    const response = await (input.fetchImpl ?? fetch)('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Idempotency-Key': input.idempotencyKey,
        'Stripe-Version': STRIPE_API_VERSION,
      },
      body: params.toString(),
      signal: controller.signal,
    })
    if (!response.ok) return { ok: false, ...httpFailure(response.status) }
    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      return { ok: false, category: 'unknown', code: 'stripe_checkout_response_invalid_json' }
    }
    if (!payload || typeof payload !== 'object') return { ok: false, category: 'unknown', code: 'stripe_checkout_response_invalid' }
    const record = payload as Record<string, unknown>
    const sessionId = typeof record.id === 'string' ? record.id : ''
    const url = typeof record.url === 'string' ? record.url : ''
    const status = record.status
    if (!/^cs_(test_|live_)?[A-Za-z0-9]+$/.test(sessionId) || !/^https:\/\//.test(url) || status !== 'open') {
      return { ok: false, category: 'unknown', code: 'stripe_checkout_response_contract_invalid' }
    }
    return { ok: true, sessionId, url, status: 'open' }
  } catch {
    return { ok: false, category: 'unavailable', code: controller.signal.aborted ? 'stripe_checkout_request_timeout' : 'stripe_network_error' }
  } finally {
    clearTimeout(timeout)
  }
}
