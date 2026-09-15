export const PAYMENT_PROVIDERS = ['stripe', 'iyzico'] as const
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number]
export type PaymentProviderMode = 'test' | 'live'

export type IyzicoWebhookIdentityInput = {
  format: 'direct' | 'hpp'
  paymentId?: string | null
  token?: string | null
}

export const PAYMENT_PROVIDER_ADAPTER_METHODS = [
  'validateConnection',
  'createCheckout',
  'retrievePayment',
  'verifyWebhook',
  'refund',
] as const

/** iYzico payment events accepted before merchant-specific risk capabilities are verified. */
export const IYZICO_VERIFIED_PAYMENT_EVENT_TYPES = [
  'PAYMENT_API',
  'API_AUTH',
  'THREE_DS_AUTH',
  'THREE_DS_CALLBACK',
  'CHECKOUT_FORM_AUTH',
  'BKM_AUTH',
  'PWI_TKN_AUTH',
  'PWI_TKN_THREEDS_AUTH',
] as const

/** Risk outcomes that stay blocked until the iYzico contract and capability are proven. */
export const IYZICO_UNVERIFIED_RISK_STATUSES = [
  'REFUND',
  'REFUNDED',
  'CANCEL',
  'CANCELED',
  'CANCELLED',
  'CHARGEBACK',
  'DISPUTE',
  'DISPUTED',
] as const

export function isIyzicoUnverifiedRiskStatus(value: string): boolean {
  return (IYZICO_UNVERIFIED_RISK_STATUSES as readonly string[]).includes(value.toUpperCase())
}

export type ProviderCapabilities = {
  provider: PaymentProvider
  mode: PaymentProviderMode
  currencies: readonly string[]
  hostedCheckout: boolean
  refunds: boolean
  threeDS: boolean
  googlePay: boolean
}

/** Returns the reference used by the corresponding iYzico checkout flow for order matching. */
export function canonicalIyzicoWebhookPaymentId(input: IyzicoWebhookIdentityInput): string | null {
  return input.format === 'hpp' ? input.token ?? null : input.paymentId ?? null
}

/** Provider boundary implemented by server-only adapters, never by public clients. */
export interface PaymentProviderAdapter {
  provider: PaymentProvider
  validateConnection(input: unknown): Promise<ProviderCapabilities>
  createCheckout(input: unknown): Promise<unknown>
  retrievePayment(input: unknown): Promise<unknown>
  verifyWebhook(input: unknown): unknown
  refund(input: unknown): Promise<unknown>
}

export const PAYMENT_FAILURE_CATEGORIES = [
  'declined',
  'requires_action',
  'configuration',
  'rate_limited',
  'unavailable',
  'unknown',
] as const
export type PaymentFailureCategory = (typeof PAYMENT_FAILURE_CATEGORIES)[number]

export function isPaymentProvider(value: unknown): value is PaymentProvider {
  return typeof value === 'string' && (PAYMENT_PROVIDERS as readonly string[]).includes(value)
}

export function isPaymentProviderAdapter(value: unknown): value is PaymentProviderAdapter {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  const forbiddenKeys = ['secretKey', 'apiKey', 'webhookSecret', 'cardNumber', 'cvv', 'cvc', 'pan']
  if (forbiddenKeys.some((key) => key in record)) return false
  return isPaymentProvider(record.provider)
    && PAYMENT_PROVIDER_ADAPTER_METHODS.every((method) => typeof record[method] === 'function')
}

/** Keeps provider-specific errors inside the server boundary as safe categories. */
export function normalizeProviderFailure(value: unknown): PaymentFailureCategory {
  if (typeof value !== 'string') return 'unknown'
  return (PAYMENT_FAILURE_CATEGORIES as readonly string[]).includes(value)
    ? value as PaymentFailureCategory
    : 'unknown'
}
