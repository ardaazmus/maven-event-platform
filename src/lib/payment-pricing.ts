import { parsePaymentAmount, type PaymentCurrency } from '@/lib/payment-money'

export type PublishedPaymentPolicy =
  | { type: 'fixed'; amount: string; currency: PaymentCurrency }
  | { type: 'field'; fieldKey: string; currency: PaymentCurrency }
  | { type: 'price_table'; fieldKey: string; currency: PaymentCurrency; prices: Record<string, string> }

type PaymentPricingResult =
  | { ok: true; amountMinor: number; currency: PaymentCurrency }
  | { ok: false; reason: 'amount_invalid' | 'field_value_invalid' | 'price_selection_invalid' }

/** Calculates the payable amount from the immutable published policy, never from a client amount. */
export function calculatePublishedPayment(
  policy: PublishedPaymentPolicy,
  values: Record<string, unknown>,
): PaymentPricingResult {
  let amount: string | undefined

  if (policy.type === 'fixed') {
    amount = policy.amount
  } else {
    const selection = values[policy.fieldKey]
    if (typeof selection !== 'string' || !selection.trim()) return { ok: false, reason: 'field_value_invalid' }
    amount = policy.type === 'field' ? selection : policy.prices[selection]
    if (policy.type === 'price_table' && amount === undefined) return { ok: false, reason: 'price_selection_invalid' }
  }

  const amountMinor = parsePaymentAmount(amount, policy.currency)
  if (amountMinor === null) return { ok: false, reason: 'amount_invalid' }

  return { ok: true, amountMinor, currency: policy.currency }
}
