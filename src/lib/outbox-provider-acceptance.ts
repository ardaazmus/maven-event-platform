import { normalizeProviderMessageIdentity } from '@/lib/email-provider-correlation'

export type ProviderAcceptedOutboxInput = {
  provider: string
  providerMessageId: string
  acceptedAt: Date
}

/** Builds the durable outbox update for provider acceptance, not delivery. */
export function buildProviderAcceptedOutboxData(input: ProviderAcceptedOutboxInput) {
  const identity = normalizeProviderMessageIdentity(input)
  if (!(input.acceptedAt instanceof Date) || Number.isNaN(input.acceptedAt.getTime())) throw new Error('accepted_at_invalid')
  return {
    status: 'sent' as const,
    sentAt: input.acceptedAt,
    provider: identity.provider,
    providerMessageId: identity.providerMessageId,
    lockedBy: null,
    lockedUntil: null,
  }
}
