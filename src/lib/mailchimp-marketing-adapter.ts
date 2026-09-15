import { canEnableBulkSending, type EmailDomainHealth } from '@/lib/email-domain-health'
import { canEnqueueEmail, type EmailConsentState } from '@/lib/email-consent'
import type { EmailSuppression } from '@/lib/email-suppression'
import { isEmailSuppressedForMessage } from '@/lib/email-suppression'
import { senderProfileRequiresVerification, type SenderProfile } from '@/lib/email-sender-profile'

export type MailchimpMarketingAudienceAddInput = {
  workspaceId: string
  audienceId: string
  recipientEmail: string
  consentState: EmailConsentState | null
  suppressions: readonly EmailSuppression[]
  senderProfile: SenderProfile
  domainHealth: EmailDomainHealth
  providerApiKeyEnvelope: string
}

export type MailchimpMarketingAudienceAddResult =
  | {
      status: 'ready'
      provider: 'mailchimp_marketing'
      action: 'upsert_member'
      workspaceId: string
      audienceId: string
      recipientEmail: string
    }
  | {
      status: 'blocked'
      reason: 'marketing_consent_required' | 'recipient_suppressed' | 'sender_profile_unhealthy' | 'domain_unhealthy' | 'secret_not_ready'
    }

const credentialEnvelopePattern = /^v1:[A-Za-z0-9._-]{1,32}:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$/
const emailPattern = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/

function requireIdentifier(value: string, error: string): string {
  const normalized = value.trim()
  if (!normalized) throw new Error(error)
  return normalized
}

function normalizeRecipientEmail(value: string): string {
  const normalized = value.trim().toLowerCase()
  if (!emailPattern.test(normalized)) throw new Error('recipient_email_invalid')
  return normalized
}

function isMarketingConsentAllowed(input: MailchimpMarketingAudienceAddInput): boolean {
  return canEnqueueEmail({
    messageClass: 'marketing',
    consentState: input.consentState,
    suppressed: false,
    email: input.recipientEmail,
    suppressions: input.suppressions,
  })
}

/**
 * Validates the server-side boundary before a consented contact can reach a
 * Mailchimp Marketing audience. It deliberately returns no provider secret;
 * the later HTTP adapter must decrypt that secret only inside the server.
 */
export function prepareMailchimpMarketingAudienceAdd(
  input: MailchimpMarketingAudienceAddInput,
): MailchimpMarketingAudienceAddResult {
  const workspaceId = requireIdentifier(input.workspaceId, 'workspace_invalid')
  const audienceId = requireIdentifier(input.audienceId, 'audience_invalid')
  const recipientEmail = normalizeRecipientEmail(input.recipientEmail)

  if (input.senderProfile.workspaceId !== workspaceId) throw new Error('workspace_mismatch')
  if (input.senderProfile.messageClass !== 'marketing' || input.senderProfile.provider !== 'mailchimp_marketing') {
    throw new Error('sender_profile_invalid')
  }
  if (input.domainHealth.domain !== input.senderProfile.sendingDomain) throw new Error('domain_mismatch')

  if (!credentialEnvelopePattern.test(input.providerApiKeyEnvelope)) return { status: 'blocked', reason: 'secret_not_ready' }
  if (isEmailSuppressedForMessage(recipientEmail, input.suppressions, 'marketing')) {
    return { status: 'blocked', reason: 'recipient_suppressed' }
  }
  if (!isMarketingConsentAllowed({ ...input, recipientEmail })) {
    return { status: 'blocked', reason: 'marketing_consent_required' }
  }
  if (senderProfileRequiresVerification(input.senderProfile) || !input.senderProfile.enabled) {
    return { status: 'blocked', reason: 'sender_profile_unhealthy' }
  }
  if (!canEnableBulkSending(input.domainHealth)) return { status: 'blocked', reason: 'domain_unhealthy' }

  return {
    status: 'ready',
    provider: 'mailchimp_marketing',
    action: 'upsert_member',
    workspaceId,
    audienceId,
    recipientEmail,
  }
}
