import { normalizeEmailSuppression, type EmailSuppression } from '@/lib/email-suppression'
import type { EmailProviderEvent } from '@/lib/email-provider-event'

export type EmailProtectionDecision = {
  suppression: EmailSuppression | null
  stopRecipientRetry: boolean
  pauseMarketing: boolean
  adminAlert: 'hard_bounce' | 'complaint' | null
}

/**
 * Converts one verified provider event into a conservative protection action.
 * Persistence, workspace pausing and notification delivery belong to the
 * durable event worker; this pure decision boundary must run before them.
 */
export function decideEmailProtection(event: EmailProviderEvent): EmailProtectionDecision {
  if (event.signatureVerified !== true) throw new Error('signature_not_verified')

  if (event.eventType === 'bounce' || event.eventType === 'complaint' || event.eventType === 'unsubscribe') {
    if (!event.recipientEmail) throw new Error('recipient_required_for_protection')
    const reason = event.eventType === 'bounce' ? 'hard_bounce' : event.eventType
    return {
      suppression: normalizeEmailSuppression({ email: event.recipientEmail, reason }),
      stopRecipientRetry: event.eventType !== 'unsubscribe',
      pauseMarketing: event.eventType === 'complaint',
      adminAlert: event.eventType === 'unsubscribe' ? null : event.eventType === 'bounce' ? 'hard_bounce' : 'complaint',
    }
  }

  return {
    suppression: null,
    stopRecipientRetry: false,
    pauseMarketing: false,
    adminAlert: null,
  }
}
