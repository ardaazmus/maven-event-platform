import { isPaymentCurrency, paymentCurrencyExponent, type PaymentCurrency } from '@/lib/payment-money'
import { isPaymentProvider } from '@/lib/payment-provider-contract'
import { validateIyzicoBuyer, type IyzicoBuyer } from '@/lib/iyzico-buyer-contract'

type IyzicoCheckoutRequest = {
  locale: 'tr'
  conversationId: string
  price: string
  paidPrice: string
  currency: PaymentCurrency
  basketId: string
  paymentGroup: 'PRODUCT'
  callbackUrl: string
  basketItems: Array<{ id: string; name: string; category1: 'Form'; itemType: 'VIRTUAL'; price: string }>
  buyer: IyzicoBuyer
}

type IyzicoCheckoutInput = {
  order: unknown
  basketId: unknown
  productName: unknown
  callbackUrl: unknown
  buyer: unknown
}

type IyzicoCheckoutResult =
  | { ok: true; request: IyzicoCheckoutRequest }
  | { ok: false; reason: 'input_invalid' | 'provider_invalid' | 'amount_invalid' | 'currency_invalid' | 'idempotency_key_invalid' | 'basket_id_invalid' | 'product_invalid' | 'callback_url_invalid' | 'buyer_invalid' }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function formatMinorAmount(amountMinor: number, currency: PaymentCurrency): string {
  const exponent = paymentCurrencyExponent(currency)
  const digits = String(amountMinor)
  if (exponent === 0) return digits
  const padded = digits.padStart(exponent + 1, '0')
  return `${padded.slice(0, -exponent)}.${padded.slice(-exponent)}`
}

/** Builds the server-side iyzico Checkout Form request after validating buyer data. */
export function buildIyzicoCheckoutFormRequest(input: IyzicoCheckoutInput): IyzicoCheckoutResult {
  if (!isRecord(input) || !isRecord(input.order)) return { ok: false, reason: 'input_invalid' }
  const order = input.order
  if (order.provider !== 'iyzico' || !isPaymentProvider(order.provider)) return { ok: false, reason: 'provider_invalid' }
  if (typeof order.mode !== 'string' || (order.mode !== 'test' && order.mode !== 'live')) return { ok: false, reason: 'input_invalid' }
  if (typeof order.amountMinor !== 'number' || !Number.isSafeInteger(order.amountMinor) || order.amountMinor <= 0) return { ok: false, reason: 'amount_invalid' }
  if (typeof order.currency !== 'string' || !isPaymentCurrency(order.currency)) return { ok: false, reason: 'currency_invalid' }
  if (typeof order.idempotencyKey !== 'string' || !/^[A-Za-z0-9:_-]{16,255}$/.test(order.idempotencyKey)) return { ok: false, reason: 'idempotency_key_invalid' }
  if (typeof input.basketId !== 'string' || !/^[A-Za-z0-9:_-]{1,120}$/.test(input.basketId)) return { ok: false, reason: 'basket_id_invalid' }
  if (typeof input.productName !== 'string' || !input.productName.trim() || input.productName.length > 200 || /[\r\n]/.test(input.productName)) return { ok: false, reason: 'product_invalid' }
  if (typeof input.callbackUrl !== 'string') return { ok: false, reason: 'callback_url_invalid' }
  try {
    const callbackUrl = new URL(input.callbackUrl)
    const localTestUrl = order.mode === 'test' && callbackUrl.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(callbackUrl.hostname)
    if (callbackUrl.protocol !== 'https:' && !localTestUrl) throw new Error('callback url must be secure')
  } catch {
    return { ok: false, reason: 'callback_url_invalid' }
  }
  const buyer = validateIyzicoBuyer(input.buyer)
  if (!buyer.ok) return { ok: false, reason: 'buyer_invalid' }

  const price = formatMinorAmount(order.amountMinor, order.currency)
  return {
    ok: true,
    request: {
      locale: 'tr',
      conversationId: order.idempotencyKey,
      price,
      paidPrice: price,
      currency: order.currency,
      basketId: input.basketId,
      paymentGroup: 'PRODUCT',
      callbackUrl: input.callbackUrl,
      basketItems: [{ id: input.basketId, name: input.productName.trim(), category1: 'Form', itemType: 'VIRTUAL', price }],
      buyer: buyer.buyer,
    },
  }
}
