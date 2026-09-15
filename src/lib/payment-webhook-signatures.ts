import { createHmac, timingSafeEqual } from 'node:crypto'

const DEFAULT_STRIPE_TOLERANCE_MS = 5 * 60 * 1000

function equalHex(expected: string, actual: string): boolean {
  if (!/^[a-f0-9]+$/i.test(actual) || actual.length !== expected.length) return false
  const expectedBuffer = Buffer.from(expected, 'hex')
  const actualBuffer = Buffer.from(actual, 'hex')
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer)
}

/** Verifies Stripe's signed raw request body and rejects stale replay attempts. */
export function verifyStripeWebhookSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  endpointSecret: string,
  nowMs = Date.now(),
  toleranceMs = DEFAULT_STRIPE_TOLERANCE_MS,
): boolean {
  if (!rawBody || !signatureHeader || !endpointSecret || !Number.isFinite(nowMs) || toleranceMs < 0) return false

  const values = signatureHeader.split(',').reduce<Record<string, string[]>>((result, item) => {
    const [key, value] = item.split('=', 2)
    if (key && value) result[key] = [...(result[key] || []), value]
    return result
  }, {})
  const timestamp = Number(values.t?.[0])
  if (!Number.isSafeInteger(timestamp) || Math.abs(nowMs - timestamp * 1000) > toleranceMs) return false

  const expected = createHmac('sha256', endpointSecret).update(`${timestamp}.${rawBody}`, 'utf8').digest('hex')
  return (values.v1 || []).some((candidate) => equalHex(expected, candidate))
}

export type IyzicoWebhookSignatureFormat = 'direct' | 'hpp'

export interface IyzicoWebhookSignatureInput {
  format: IyzicoWebhookSignatureFormat
  secretKey: string
  eventType: string
  paymentConversationId: string
  status: string
  paymentId?: string
  iyziPaymentId?: string
  token?: string
}

function iyzicoMessage(input: IyzicoWebhookSignatureInput): string | null {
  if (!input.secretKey || !input.eventType || !input.paymentConversationId || !input.status) return null
  if (input.format === 'direct') {
    if (!input.paymentId) return null
    return input.secretKey + input.eventType + input.paymentId + input.paymentConversationId + input.status
  }
  if (!input.iyziPaymentId || !input.token) return null
  return input.secretKey + input.eventType + input.iyziPaymentId + input.token + input.paymentConversationId + input.status
}

/** Verifies iyzico's X-IYZ-SIGNATURE-V3 HMAC for direct or Checkout Form events. */
export function verifyIyzicoV3WebhookSignature(input: IyzicoWebhookSignatureInput, signatureHeader: string | null | undefined): boolean {
  const message = iyzicoMessage(input)
  if (!message || !signatureHeader || !/^[a-f0-9]{64}$/i.test(signatureHeader)) return false
  const expected = createHmac('sha256', input.secretKey).update(message, 'utf8').digest('hex')
  return equalHex(expected, signatureHeader)
}
