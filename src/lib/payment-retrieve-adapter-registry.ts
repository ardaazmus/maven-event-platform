import { decryptPaymentCredential } from '@/lib/payment-credentials'
import { parseIyzicoCredentialSet } from '@/lib/iyzico-credentials-contract'
import { retrieveIyzicoCheckoutFormPayment } from '@/lib/iyzico-retrieve'
import { isPaymentProvider, type PaymentProvider, type PaymentProviderMode } from '@/lib/payment-provider-contract'
import { retrieveStripePayment } from '@/lib/stripe-retrieve'

type RetrieveAdapterInput = {
  mode: PaymentProviderMode
  providerPaymentId: string
  credentials?: unknown
}

export type PaymentRetrieveAdapter = {
  provider: PaymentProvider
  retrievePayment(input: RetrieveAdapterInput): Promise<unknown>
}

type PaymentRetrieveResolutionInput = {
  provider: unknown
  mode: unknown
  credentialsEnvelope: string | null
  env?: NodeJS.ProcessEnv
}

export type PaymentRetrieveAdapterResolution =
  | { ok: true; provider: PaymentProvider; mode: PaymentProviderMode; hasCredentials: true; adapter: PaymentRetrieveAdapter }
  | { ok: false; reason: 'provider_invalid' | 'mode_invalid' | 'credentials_missing' | 'credentials_invalid' | 'adapter_unavailable' }

type StripeRetrieveCredentials = { secretKey: string }

function isMode(value: unknown): value is PaymentProviderMode {
  return value === 'test' || value === 'live'
}

function parseJsonObject(value: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null
  } catch {
    return null
  }
}

function parseStripeRetrieveCredentials(value: unknown): StripeRetrieveCredentials | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  if ('apiKey' in record && 'secretKey' in record) return null
  const secretKey = typeof record.secretKey === 'string' ? record.secretKey : typeof record.apiKey === 'string' ? record.apiKey : null
  if (!secretKey || secretKey.length > 500 || /[\r\n\0]/.test(secretKey)) return null
  return { secretKey }
}

function stripeRetrieveAdapter(credentials: StripeRetrieveCredentials, mode: PaymentProviderMode): PaymentRetrieveAdapter {
  return {
    provider: 'stripe',
    async retrievePayment(input) {
      if (input.mode !== mode) return { ok: false, category: 'configuration', code: 'stripe_mode_mismatch' }
      return retrieveStripePayment({
        secretKey: credentials.secretKey,
        mode,
        paymentIntentId: input.providerPaymentId,
      })
    },
  }
}

function iyzicoRetrieveAdapter(credentials: { apiKey: string; secretKey: string }, mode: PaymentProviderMode): PaymentRetrieveAdapter {
  return {
    provider: 'iyzico',
    async retrievePayment(input) {
      if (input.mode !== mode) return { ok: false, category: 'configuration', code: 'iyzico_mode_mismatch' }
      return retrieveIyzicoCheckoutFormPayment({
        mode,
        baseUrl: mode === 'test' ? 'https://sandbox-api.iyzipay.com' : 'https://api.iyzipay.com',
        credentials,
        token: input.providerPaymentId,
      })
    },
  }
}

/** Resolves a server-only retrieve adapter while keeping decrypted credentials inside its closure. */
export function resolvePaymentRetrieveAdapter(input: PaymentRetrieveResolutionInput): PaymentRetrieveAdapterResolution {
  if (!isPaymentProvider(input.provider)) return { ok: false, reason: 'provider_invalid' }
  if (!isMode(input.mode)) return { ok: false, reason: 'mode_invalid' }
  if (!input.credentialsEnvelope) return { ok: false, reason: 'credentials_missing' }

  let decrypted: string
  try {
    decrypted = decryptPaymentCredential(input.credentialsEnvelope, input.env)
  } catch {
    return { ok: false, reason: 'credentials_invalid' }
  }
  const credentials = parseStripeRetrieveCredentials(parseJsonObject(decrypted))
  if (input.provider === 'stripe') {
    if (!credentials) return { ok: false, reason: 'credentials_invalid' }

    return {
      ok: true,
      provider: 'stripe',
      mode: input.mode,
      hasCredentials: true,
      adapter: stripeRetrieveAdapter(credentials, input.mode),
    }
  }
  const iyzicoCredentials = parseIyzicoCredentialSet(parseJsonObject(decrypted))
  if (!iyzicoCredentials.ok) return { ok: false, reason: 'credentials_invalid' }

  return {
    ok: true,
    provider: 'iyzico',
    mode: input.mode,
    hasCredentials: true,
    adapter: iyzicoRetrieveAdapter(iyzicoCredentials.credentials, input.mode),
  }
}
