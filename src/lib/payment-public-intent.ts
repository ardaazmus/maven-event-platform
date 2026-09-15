import { calculatePublishedPayment, type PublishedPaymentPolicy } from '@/lib/payment-pricing'
import { isPaymentCurrency } from '@/lib/payment-money'
import { isPaymentProvider } from '@/lib/payment-provider-contract'
import { validatePaymentOrderInput, type PaymentOrderSnapshot } from '@/lib/payment-order-contract'

type PublicPaymentIntentResult =
  | { ok: true; snapshot: PaymentOrderSnapshot }
  | { ok: false; reason: 'context_invalid' | 'payment_disabled' | 'payment_invalid' | 'values_invalid' | 'field_value_invalid' | 'price_selection_invalid' | 'amount_invalid' | 'idempotency_key_invalid' | 'resource_id_invalid' | 'provider_invalid' | 'mode_invalid' | 'currency_invalid' | 'input_invalid' | 'unexpected_client_amount' }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPublishedPaymentPolicy(value: unknown): value is PublishedPaymentPolicy {
  if (!isRecord(value) || typeof value.type !== 'string' || typeof value.currency !== 'string' || !isPaymentCurrency(value.currency)) return false
  if (value.type === 'fixed') return typeof value.amount === 'string'
  if (typeof value.fieldKey !== 'string' || !/^[A-Za-z0-9_-]{1,120}$/.test(value.fieldKey)) return false
  if (value.type === 'field') return true
  if (value.type !== 'price_table' || !isRecord(value.prices)) return false
  return Object.values(value.prices).every((amount) => typeof amount === 'string')
}

/** Builds a server-owned payment order snapshot from a published policy; it never trusts client price, provider, or mode. */
export function buildPublicPaymentOrderSnapshot(context: unknown, input: unknown): PublicPaymentIntentResult {
  if (!isRecord(context) || !isRecord(input)) return { ok: false, reason: 'context_invalid' }
  if (!isRecord(context.payment) || context.payment.enabled !== true) return { ok: false, reason: 'payment_disabled' }
  if (!isPaymentProvider(context.payment.provider) || !isPublishedPaymentPolicy(context.payment.pricingPolicy)) {
    return { ok: false, reason: 'payment_invalid' }
  }

  const values = input.values === undefined ? {} : input.values
  if (!isRecord(values)) return { ok: false, reason: 'values_invalid' }
  const pricing = calculatePublishedPayment(context.payment.pricingPolicy, values)
  if (!pricing.ok) return pricing

  return validatePaymentOrderInput({
    workspaceId: context.workspaceId,
    formId: context.formId,
    publishedVersionId: context.publishedVersionId,
    provider: context.payment.provider,
    mode: context.mode,
    idempotencyKey: input.idempotencyKey,
    serverAmountMinor: pricing.amountMinor,
    currency: pricing.currency,
  })
}
