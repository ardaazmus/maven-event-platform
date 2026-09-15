import { isPaymentProvider, type PaymentProvider, type PaymentProviderMode } from '@/lib/payment-provider-contract'

type PaymentRetrieveAdapter = {
  provider: PaymentProvider
  retrievePayment(input: {
    mode: PaymentProviderMode
    providerPaymentId: string
    credentials: unknown
  }): Promise<unknown>
}

type PaymentRetrievePortInput = {
  provider: unknown
  mode: unknown
  providerPaymentId: unknown
  credentials: unknown
}

export type PaymentRetrievePortResult =
  | { ok: true; raw: unknown }
  | { ok: false; category: 'configuration' | 'unavailable'; code: 'provider_adapter_mismatch' | 'provider_retrieve_input_invalid' | 'provider_retrieve_adapter_failed' }

function isMode(value: unknown): value is PaymentProviderMode {
  return value === 'test' || value === 'live'
}

function isProviderPaymentId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{8,255}$/.test(value)
}

function isAdapter(value: unknown): value is PaymentRetrieveAdapter {
  if (!value || typeof value !== 'object') return false
  return 'provider' in value && 'retrievePayment' in value && typeof value.retrievePayment === 'function'
}

/** Runs a retrieve adapter only from the internal worker boundary. */
export async function runPaymentRetrieveAdapter(
  adapter: unknown,
  input: PaymentRetrievePortInput,
): Promise<PaymentRetrievePortResult> {
  if (!isAdapter(adapter) || !isPaymentProvider(input.provider) || adapter.provider !== input.provider) {
    return { ok: false, category: 'configuration', code: 'provider_adapter_mismatch' }
  }
  if (!isMode(input.mode) || !isProviderPaymentId(input.providerPaymentId) || input.credentials === null || input.credentials === undefined) {
    return { ok: false, category: 'configuration', code: 'provider_retrieve_input_invalid' }
  }

  try {
    const raw = await adapter.retrievePayment({
      mode: input.mode,
      providerPaymentId: input.providerPaymentId,
      credentials: input.credentials,
    })
    return { ok: true, raw }
  } catch {
    return { ok: false, category: 'unavailable', code: 'provider_retrieve_adapter_failed' }
  }
}
