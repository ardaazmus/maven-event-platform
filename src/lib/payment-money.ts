export type PaymentCurrency = 'TRY' | 'USD' | 'EUR' | 'GBP' | 'JPY'

const currencyExponent: Record<PaymentCurrency, number> = {
  TRY: 2,
  USD: 2,
  EUR: 2,
  GBP: 2,
  JPY: 0,
}

export function isPaymentCurrency(value: unknown): value is PaymentCurrency {
  return typeof value === 'string' && value.toUpperCase() in currencyExponent
}

export function paymentCurrencyExponent(currency: PaymentCurrency): number {
  return currencyExponent[currency]
}

/** Converts a decimal amount string to provider-safe integer minor units without floating point math. */
export function parsePaymentAmount(amount: string, currency: PaymentCurrency): number | null {
  if (typeof amount !== 'string' || !/^\d+(?:\.\d+)?$/.test(amount)) return null
  const exponent = paymentCurrencyExponent(currency)
  const [whole, fraction = ''] = amount.split('.')
  if (fraction.length > exponent || (exponent === 0 && fraction.length > 0)) return null
  const minorText = `${whole}${fraction.padEnd(exponent, '0')}`.replace(/^0+(?=\d)/, '')
  const minor = Number(minorText || '0')
  return Number.isSafeInteger(minor) && minor > 0 ? minor : null
}

export function assertPaymentAmount(amountMinor: number): number {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) throw new Error('payment_amount_invalid')
  return amountMinor
}

export function normalizePaymentCurrency(currency: string): PaymentCurrency | null {
  const normalized = currency.trim().toUpperCase()
  return isPaymentCurrency(normalized) ? normalized : null
}
