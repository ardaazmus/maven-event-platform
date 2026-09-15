import { isPublicPaymentKey } from '@/lib/payment-status-key'

type PaymentCallbackInput = {
  appOrigin: unknown
  slug: unknown
  mode: unknown
  publicKey?: unknown
}

type PaymentCallbackResult =
  | { ok: true; callbackUrl: string }
  | { ok: false; reason: 'input_invalid' | 'origin_invalid' | 'slug_invalid' | 'mode_invalid' | 'public_key_invalid' }

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
}

/** Builds a provider callback URL from the configured app origin, never from the request Host header. */
export function buildPublicPaymentCallbackUrl(input: PaymentCallbackInput): PaymentCallbackResult {
  if (!input || typeof input !== 'object') return { ok: false, reason: 'input_invalid' }
  if (input.mode !== 'test' && input.mode !== 'live') return { ok: false, reason: 'mode_invalid' }
  if (typeof input.slug !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/.test(input.slug)) return { ok: false, reason: 'slug_invalid' }
  if (input.publicKey !== undefined && !isPublicPaymentKey(input.publicKey)) return { ok: false, reason: 'public_key_invalid' }

  let origin: URL
  try {
    origin = new URL(typeof input.appOrigin === 'string' ? input.appOrigin : '')
    const localTestOrigin = input.mode === 'test' && origin.protocol === 'http:' && isLocalHost(origin.hostname)
    if ((origin.protocol !== 'https:' && !localTestOrigin) || origin.pathname !== '/' || origin.search || origin.hash || origin.username || origin.password) throw new Error('origin must be an app origin')
  } catch {
    return { ok: false, reason: 'origin_invalid' }
  }

  const callbackUrl = new URL(`/api/public/forms/${input.slug}/payment-callback`, origin)
  if (input.publicKey !== undefined) callbackUrl.searchParams.set('receipt', input.publicKey as string)
  return { ok: true, callbackUrl: callbackUrl.toString() }
}
