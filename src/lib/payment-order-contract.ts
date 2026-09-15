import { isPaymentProvider, type PaymentProvider, type PaymentProviderMode } from '@/lib/payment-provider-contract'
import { assertPaymentAmount, normalizePaymentCurrency, type PaymentCurrency } from '@/lib/payment-money'

export type PaymentOrderSnapshot = {
  workspaceId: string
  formId: string
  publishedVersionId: string
  provider: PaymentProvider
  mode: PaymentProviderMode
  idempotencyKey: string
  amountMinor: number
  currency: PaymentCurrency
}

type PaymentOrderValidationResult =
  | { ok: true; snapshot: PaymentOrderSnapshot }
  | { ok: false; reason: 'input_invalid' | 'unexpected_client_amount' | 'provider_invalid' | 'mode_invalid' | 'idempotency_key_invalid' | 'amount_invalid' | 'currency_invalid' | 'resource_id_invalid' }

function validResourceId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 200 && !/[\r\n]/.test(value)
}

/** Validates the server-computed order snapshot before persistence or provider checkout. */
export function validatePaymentOrderInput(input: unknown): PaymentOrderValidationResult {
  if (!input || typeof input !== 'object') return { ok: false, reason: 'input_invalid' }
  const record = input as Record<string, unknown>
  if (['amount', 'amountMinor', 'clientAmount'].some((key) => key in record)) {
    return { ok: false, reason: 'unexpected_client_amount' }
  }
  if (!validResourceId(record.workspaceId) || !validResourceId(record.formId) || !validResourceId(record.publishedVersionId)) {
    return { ok: false, reason: 'resource_id_invalid' }
  }
  if (!isPaymentProvider(record.provider)) return { ok: false, reason: 'provider_invalid' }
  if (record.mode !== 'test' && record.mode !== 'live') return { ok: false, reason: 'mode_invalid' }
  if (typeof record.idempotencyKey !== 'string' || !/^[A-Za-z0-9:_-]{16,255}$/.test(record.idempotencyKey)) {
    return { ok: false, reason: 'idempotency_key_invalid' }
  }
  if (typeof record.serverAmountMinor !== 'number') return { ok: false, reason: 'amount_invalid' }
  try {
    assertPaymentAmount(record.serverAmountMinor)
  } catch {
    return { ok: false, reason: 'amount_invalid' }
  }
  if (typeof record.currency !== 'string') return { ok: false, reason: 'currency_invalid' }
  const currency = normalizePaymentCurrency(record.currency)
  if (!currency) return { ok: false, reason: 'currency_invalid' }

  return {
    ok: true,
    snapshot: {
      workspaceId: record.workspaceId,
      formId: record.formId,
      publishedVersionId: record.publishedVersionId,
      provider: record.provider,
      mode: record.mode,
      idempotencyKey: record.idempotencyKey,
      amountMinor: record.serverAmountMinor,
      currency,
    },
  }
}
