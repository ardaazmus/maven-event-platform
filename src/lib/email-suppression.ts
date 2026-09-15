import type { EmailMessageClass } from '@/lib/email-policy'

export type EmailSuppressionReason = 'hard_bounce' | 'complaint' | 'unsubscribe' | 'manual_block'
export type EmailSuppressionScope = 'all' | 'marketing'

export type EmailSuppressionInput = {
  email: string
  reason: string
  scope?: string
}

export type EmailSuppression = {
  email: string
  reason: EmailSuppressionReason
  scope: EmailSuppressionScope
}

const reasons: EmailSuppressionReason[] = ['hard_bounce', 'complaint', 'unsubscribe', 'manual_block']
const scopes: EmailSuppressionScope[] = ['all', 'marketing']

function normalizeEmail(email: string): string {
  const normalized = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error('invalid email')
  return normalized
}

function defaultScope(reason: EmailSuppressionReason): EmailSuppressionScope {
  return reason === 'unsubscribe' ? 'marketing' : 'all'
}

/** Converts provider/user suppression input into a bounded, persistable record. */
export function normalizeEmailSuppression(input: EmailSuppressionInput): EmailSuppression {
  const reason = input.reason.trim().toLowerCase()
  if (!reasons.includes(reason as EmailSuppressionReason)) throw new Error('invalid suppression reason')

  const normalizedReason = reason as EmailSuppressionReason
  const scope = input.scope?.trim().toLowerCase() || defaultScope(normalizedReason)
  if (!scopes.includes(scope as EmailSuppressionScope)) throw new Error('invalid suppression scope')
  if ((normalizedReason === 'hard_bounce' || normalizedReason === 'complaint') && scope !== 'all') {
    throw new Error('bounce and complaint suppression scope must be all')
  }

  return {
    email: normalizeEmail(input.email),
    reason: normalizedReason,
    scope: scope as EmailSuppressionScope,
  }
}

/** Returns whether an address is suppressed for the requested message class. */
export function isEmailSuppressedForMessage(
  email: string,
  suppressions: readonly EmailSuppression[],
  messageClass: EmailMessageClass,
): boolean {
  const normalizedEmail = normalizeEmail(email)
  return suppressions.some(suppression => (
    suppression.email === normalizedEmail && (suppression.scope === 'all' || messageClass === 'marketing')
  ))
}
