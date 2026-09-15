import type { EmailSuppressionReason } from '@/lib/email-suppression'

export type EmailProviderEventType = 'delivered' | 'bounce' | 'reject' | 'complaint' | 'unsubscribe'

export type EmailProviderEventInput = {
  provider: string
  externalEventId: string
  eventType: string
  providerMessageId?: string | null
  recipientEmail?: string | null
  payloadHash: string
  signatureVerified: boolean
}

export type EmailProviderEvent = {
  provider: string
  externalEventId: string
  eventType: EmailProviderEventType
  providerMessageId?: string
  recipientEmail: string | null
  payloadHash: string
  signatureVerified: true
}

export function suppressionReasonForEmailProviderEvent(eventType: EmailProviderEventType): EmailSuppressionReason | null {
  if (eventType === 'bounce') return 'hard_bounce'
  if (eventType === 'complaint') return 'complaint'
  if (eventType === 'unsubscribe') return 'unsubscribe'
  return null
}

function normalizeRecipientEmail(email: string | null | undefined): string | null {
  if (!email) return null
  const normalized = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error('invalid recipient email')
  return normalized
}

/** Normalizes one already-authenticated provider event without retaining its raw payload. */
export function normalizeEmailProviderEvent(input: EmailProviderEventInput): EmailProviderEvent {
  const provider = input.provider.trim().toLowerCase()
  const externalEventId = input.externalEventId.trim()
  const eventType = input.eventType.trim().toLowerCase()
  const providerMessageId = input.providerMessageId?.trim() || null
  const eventTypes: EmailProviderEventType[] = ['delivered', 'bounce', 'reject', 'complaint', 'unsubscribe']

  if (!provider || provider.length > 64) throw new Error('invalid email provider')
  if (!externalEventId || externalEventId.length > 256) throw new Error('invalid email provider event id')
  if (!eventTypes.includes(eventType as EmailProviderEventType)) throw new Error('invalid email provider event type')
  if (input.providerMessageId != null && (!providerMessageId || providerMessageId.length > 256 || /[\r\n]/.test(providerMessageId))) {
    throw new Error('invalid provider message id')
  }
  if (!input.payloadHash.trim() || input.payloadHash.length > 256) throw new Error('invalid email provider payload hash')
  if (!input.signatureVerified) throw new Error('email provider event signature must be verified')

  return {
    provider,
    externalEventId,
    ...(providerMessageId ? { providerMessageId } : {}),
    eventType: eventType as EmailProviderEventType,
    recipientEmail: normalizeRecipientEmail(input.recipientEmail),
    payloadHash: input.payloadHash.trim(),
    signatureVerified: true,
  }
}

/** Matches the database uniqueness boundary used to make provider retries idempotent. */
export function emailProviderEventDedupeKey(workspaceId: string, event: EmailProviderEvent): string {
  const normalizedWorkspaceId = workspaceId.trim()
  if (!normalizedWorkspaceId) throw new Error('workspace id is required')
  return `${normalizedWorkspaceId}:${event.provider}:${event.externalEventId}`
}

/** Builds the raw-payload-free Prisma row for one already verified provider event. */
export function buildEmailProviderEventCreateData(workspaceId: string, event: EmailProviderEvent) {
  const normalizedWorkspaceId = workspaceId.trim()
  if (!normalizedWorkspaceId) throw new Error('workspace id is required')
  return {
    workspaceId: normalizedWorkspaceId,
    provider: event.provider,
    externalEventId: event.externalEventId,
    providerMessageId: event.providerMessageId ?? null,
    eventType: event.eventType,
    recipientEmail: event.recipientEmail,
    payloadHash: event.payloadHash,
    signatureVerified: event.signatureVerified,
  }
}
