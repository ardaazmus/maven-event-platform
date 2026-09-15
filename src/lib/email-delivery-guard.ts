import type { EmailMessageClass } from '@/lib/email-policy'
import type { EmailSuppressionScope } from '@/lib/email-suppression'

export type QueuedEmailDeliveryInput = {
  messageClass: EmailMessageClass
  suppressionScopes: readonly EmailSuppressionScope[]
  marketingPaused: boolean
}

export type QueuedEmailDeliveryResult =
  | { status: 'allowed' }
  | { status: 'blocked'; reason: 'marketing_paused' | 'recipient_suppressed' }

/** Applies durable suppression and workspace pause state before provider dispatch/retry. */
export function evaluateQueuedEmailDelivery(input: QueuedEmailDeliveryInput): QueuedEmailDeliveryResult {
  if (input.messageClass === 'marketing' && input.marketingPaused) return { status: 'blocked', reason: 'marketing_paused' }
  if (input.suppressionScopes.some(scope => scope === 'all' || (scope === 'marketing' && input.messageClass === 'marketing'))) {
    return { status: 'blocked', reason: 'recipient_suppressed' }
  }
  return { status: 'allowed' }
}

/** Extracts only the explicit recipient field from an outbox email payload. */
export function extractQueuedEmailRecipient(payloadJson: string): string | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(payloadJson)
  } catch {
    throw new Error('queued_email_payload_invalid')
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('queued_email_payload_invalid')
  const value = (parsed as { recipientEmail?: unknown }).recipientEmail
  if (value === undefined || value === null) return null
  if (typeof value !== 'string' || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value.trim())) throw new Error('queued_email_recipient_invalid')
  return value.trim().toLowerCase()
}
