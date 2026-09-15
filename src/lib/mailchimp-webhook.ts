import { createHmac, timingSafeEqual } from 'node:crypto'
import { emailProviderEventDedupeKey, normalizeEmailProviderEvent, type EmailProviderEvent, type EmailProviderEventType } from '@/lib/email-provider-event'

export type MailchimpWebhookParams = Record<string, string>

export type MailchimpTransactionalWebhookInput = {
  workspaceId: string
  webhookUrl: string
  params: MailchimpWebhookParams
  signatureHeader: string | null | undefined
  webhookKey: string
  payloadHash: string
}

export type MailchimpTransactionalWebhookResult = {
  signatureVerified: true
  events: Array<{ event: EmailProviderEvent; dedupeKey: string }>
}

type MailchimpWebhookEvent = {
  _id?: unknown
  event?: unknown
  msg?: unknown
}

const eventTypeMap: Record<string, EmailProviderEventType | null> = {
  delivered: 'delivered',
  hard_bounce: 'bounce',
  soft_bounce: 'reject',
  bounce: 'bounce',
  reject: 'reject',
  spam: 'complaint',
  complaint: 'complaint',
  unsub: 'unsubscribe',
  unsubscribe: 'unsubscribe',
}

function requireText(value: string, error: string): string {
  const normalized = value.trim()
  if (!normalized) throw new Error(error)
  return normalized
}

function signedData(webhookUrl: string, params: MailchimpWebhookParams): string {
  return requireText(webhookUrl, 'webhook_url_invalid') + Object.keys(params).sort().map(key => key + params[key]).join('')
}

function equalBase64(expected: Buffer, actualValue: string | null | undefined): boolean {
  if (!actualValue) return false
  const actual = Buffer.from(actualValue, 'base64')
  return actual.length === expected.length && timingSafeEqual(expected, actual)
}

/** Creates Mailchimp Transactional's URL + sorted POST params HMAC-SHA1 signature. */
export function buildMailchimpTransactionalSignature(
  webhookUrl: string,
  params: MailchimpWebhookParams,
  webhookKey: string,
): string {
  const key = requireText(webhookKey, 'webhook_key_invalid')
  return createHmac('sha1', key).update(signedData(webhookUrl, params), 'utf8').digest('base64')
}

/** Verifies X-Mandrill-Signature using the provider's binary HMAC-SHA1/base64 format. */
export function verifyMailchimpTransactionalWebhookSignature(
  webhookUrl: string,
  params: MailchimpWebhookParams,
  signatureHeader: string | null | undefined,
  webhookKey: string,
): boolean {
  if (!signatureHeader || !webhookKey.trim()) return false
  const expected = createHmac('sha1', webhookKey).update(signedData(webhookUrl, params), 'utf8').digest()
  return equalBase64(expected, signatureHeader.trim())
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function eventRecipient(event: MailchimpWebhookEvent): string | null {
  if (!event.msg || typeof event.msg !== 'object') return null
  return stringValue((event.msg as { email?: unknown }).email)
}

function eventProviderMessageId(event: MailchimpWebhookEvent): string | null {
  if (!event.msg || typeof event.msg !== 'object') return null
  return stringValue((event.msg as { _id?: unknown })._id)
}

function parseEvents(value: string): MailchimpWebhookEvent[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    throw new Error('webhook_payload_invalid')
  }
  if (!Array.isArray(parsed) || parsed.length > 1000) throw new Error('webhook_payload_invalid')
  if (!parsed.every(item => item !== null && typeof item === 'object' && !Array.isArray(item))) throw new Error('webhook_payload_invalid')
  return parsed as MailchimpWebhookEvent[]
}

/** Verifies and reduces one Mailchimp event batch to the internal idempotent inbox shape. */
export function normalizeMailchimpTransactionalWebhook(
  input: MailchimpTransactionalWebhookInput,
): MailchimpTransactionalWebhookResult {
  const workspaceId = requireText(input.workspaceId, 'workspace_invalid')
  const payloadHash = requireText(input.payloadHash, 'payload_hash_invalid')
  if (!verifyMailchimpTransactionalWebhookSignature(input.webhookUrl, input.params, input.signatureHeader, input.webhookKey)) {
    throw new Error('webhook_signature_invalid')
  }

  const rawEvents = parseEvents(input.params.mandrill_events || '')
  const seen = new Set<string>()
  const events: Array<{ event: EmailProviderEvent; dedupeKey: string }> = []
  for (const rawEvent of rawEvents) {
    const providerEventType = eventTypeMap[stringValue(rawEvent.event) || '']
    if (!providerEventType) continue

    const externalEventId = stringValue(rawEvent._id)
    if (!externalEventId) throw new Error('webhook_event_id_invalid')
    const event = normalizeEmailProviderEvent({
      provider: 'mailchimp_transactional',
      externalEventId,
      eventType: providerEventType,
      providerMessageId: eventProviderMessageId(rawEvent),
      recipientEmail: eventRecipient(rawEvent),
      payloadHash,
      signatureVerified: true,
    })
    const dedupeKey = emailProviderEventDedupeKey(workspaceId, event)
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)
    events.push({ event, dedupeKey })
  }

  return { signatureVerified: true, events }
}
