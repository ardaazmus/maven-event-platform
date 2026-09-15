import { createHmac } from 'node:crypto'

function normalizeEmail(email: string): string {
  const normalized = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error('invalid recipient email')
  return normalized
}

/** Returns the workspace-independent HMAC identity used for email preferences and suppression records. */
export function hashRecipientEmail(email: string, secret: string): string {
  if (!secret || secret.length < 16) throw new Error('suppression_hash_secret_required')
  return createHmac('sha256', secret).update(normalizeEmail(email), 'utf8').digest('hex')
}
