import { isPaymentProvider, type PaymentProvider } from '@/lib/payment-provider-contract'

export type WebhookFixtureEvent = Readonly<{
  provider: PaymentProvider
  externalEventId: string
  paymentId: string
  eventType: string
  eventSequence: number
  receivedAtMs: number
  deliveryOrder?: number
  signatureHeader?: string | null
}>

export type WebhookTestFixture = Readonly<{
  provider: PaymentProvider
  externalEventId: string
  dedupeKey: string
  paymentId: string
  eventType: string
  eventSequence: number
  deliveryOrder: number
  receivedAtMs: number
  rawBody: string
  signatureHeader: string | null
  signatureState: 'signed' | 'unsigned'
}>

export type WebhookFixtureSetResult =
  | Readonly<{ ok: true; fixtures: readonly WebhookTestFixture[] }>
  | Readonly<{ ok: false; reason: 'input_invalid' | 'secret_forbidden' | 'duplicate_delivery_order' }>

const SAFE_ID_PATTERN = /^[A-Za-z0-9._-]{1,120}$/
const SAFE_EVENT_PATTERN = /^[A-Za-z0-9._-]{1,100}$/
const FORBIDDEN_KEYS = new Set([
  'secretKey',
  'apiKey',
  'api_key',
  'webhookSecret',
  'password',
  'privateKey',
  'private_key',
  'cardNumber',
  'cvv',
  'cvc',
  'pan',
  'payload',
  'rawPayload',
  'rawResponse',
  'providerResponse',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isSafeId(value: unknown, pattern: RegExp): value is string {
  return typeof value === 'string' && pattern.test(value)
}

function isSafeNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function hasForbiddenKey(value: Record<string, unknown>): boolean {
  return Object.keys(value).some((key) => FORBIDDEN_KEYS.has(key))
}

function isAllowedEventKeys(value: Record<string, unknown>): boolean {
  return Object.keys(value).every((key) => [
    'provider',
    'externalEventId',
    'paymentId',
    'eventType',
    'eventSequence',
    'receivedAtMs',
    'deliveryOrder',
    'signatureHeader',
  ].includes(key))
}

function serializeFixtureBody(event: WebhookFixtureEvent): string {
  return JSON.stringify({
    provider: event.provider,
    id: event.externalEventId,
    paymentId: event.paymentId,
    type: event.eventType,
    sequence: event.eventSequence,
  })
}

/** Builds bounded webhook fixtures without network, inbox writes, credentials, or provider payloads. */
export function createWebhookFixtureSet(input: unknown): WebhookFixtureSetResult {
  if (!isRecord(input)) return { ok: false, reason: 'input_invalid' }
  if (hasForbiddenKey(input)) return { ok: false, reason: 'secret_forbidden' }
  if (Object.keys(input).some((key) => key !== 'events')) return { ok: false, reason: 'input_invalid' }
  if (!Array.isArray(input.events) || input.events.length === 0 || input.events.length > 100) {
    return { ok: false, reason: 'input_invalid' }
  }

  const usedDeliveryOrders = new Set<number>()
  const fixtures: WebhookTestFixture[] = []
  for (const [index, candidate] of input.events.entries()) {
    if (!isRecord(candidate)) return { ok: false, reason: 'input_invalid' }
    if (hasForbiddenKey(candidate)) return { ok: false, reason: 'secret_forbidden' }
    if (!isAllowedEventKeys(candidate)) return { ok: false, reason: 'input_invalid' }
    const deliveryOrder = candidate.deliveryOrder ?? index
    if (!isSafeNonNegativeInteger(deliveryOrder)) return { ok: false, reason: 'input_invalid' }
    if (usedDeliveryOrders.has(deliveryOrder)) return { ok: false, reason: 'duplicate_delivery_order' }
    if (!isPaymentProvider(candidate.provider)
      || !isSafeId(candidate.externalEventId, SAFE_ID_PATTERN)
      || !isSafeId(candidate.paymentId, SAFE_ID_PATTERN)
      || !isSafeId(candidate.eventType, SAFE_EVENT_PATTERN)
      || !isSafeNonNegativeInteger(candidate.eventSequence)
      || candidate.eventSequence < 1
      || !isSafeNonNegativeInteger(candidate.receivedAtMs)
      || (candidate.signatureHeader !== undefined
        && candidate.signatureHeader !== null
        && (!isSafeId(candidate.signatureHeader, /^[A-Za-z0-9=,._-]{1,512}$/)))) return { ok: false, reason: 'input_invalid' }

    usedDeliveryOrders.add(deliveryOrder)
    const event = candidate as unknown as WebhookFixtureEvent
    const signatureHeader = candidate.signatureHeader ?? null
    fixtures.push({
      provider: event.provider,
      externalEventId: event.externalEventId,
      dedupeKey: `${event.provider}:${event.externalEventId}`,
      paymentId: event.paymentId,
      eventType: event.eventType,
      eventSequence: event.eventSequence,
      deliveryOrder,
      receivedAtMs: event.receivedAtMs,
      rawBody: serializeFixtureBody(event),
      signatureHeader,
      signatureState: signatureHeader ? 'signed' : 'unsigned',
    })
  }

  return { ok: true, fixtures }
}
