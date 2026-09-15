import type { EmailMessageClass } from '@/lib/email-policy'
import { isEmailSuppressedForMessage, type EmailSuppression } from '@/lib/email-suppression'

export type EmailConsentState = 'granted' | 'revoked' | 'unknown' | 'suppressed'

export type EmailEnqueuePolicyInput = {
  messageClass: EmailMessageClass
  consentState: EmailConsentState | null
  suppressed: boolean
  email?: string
  suppressions?: readonly EmailSuppression[]
}

const consentStates: EmailConsentState[] = ['granted', 'revoked', 'unknown', 'suppressed']

export function normalizeConsentState(value: string): EmailConsentState | null {
  const normalized = value.trim().toLowerCase()
  return consentStates.includes(normalized as EmailConsentState) ? normalized as EmailConsentState : null
}

export function canEnqueueEmail(input: EmailEnqueuePolicyInput): boolean {
  if (input.suppressed) return false
  if (input.email && input.suppressions && isEmailSuppressedForMessage(input.email, input.suppressions, input.messageClass)) return false
  if (input.messageClass !== 'marketing') return true
  return input.consentState === 'granted'
}
