import { createHmac, timingSafeEqual } from 'node:crypto'
import { hashRecipientEmail } from '@/lib/email-recipient-hash'

export const MARKETING_UNSUBSCRIBE_TTL_MS = 30 * 24 * 60 * 60 * 1000

type MarketingUnsubscribeInput = {
  workspaceId: string
  recipientEmail: string
}

export type MarketingUnsubscribePayload = {
  version: 'v1'
  workspaceId: string
  recipientHash: string
  scope: 'marketing'
  expiresAt: number
}

function requireSecret(secret: string): string {
  if (!secret || secret.length < 16) throw new Error('unsubscribe secret must be at least 16 characters')
  return secret
}

function normalizeEmail(email: string): string {
  const normalized = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error('invalid recipient email')
  return normalized
}

function normalizeWorkspaceId(workspaceId: string): string {
  const normalized = workspaceId.trim()
  if (!normalized || normalized.length > 128) throw new Error('workspace id is required')
  return normalized
}

function encode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function sign(version: string, encodedPayload: string, secret: string): string {
  return createHmac('sha256', secret).update(`${version}.${encodedPayload}`, 'utf8').digest('base64url')
}

/** Creates an opaque, signed marketing-only unsubscribe token without embedding the email address. */
export function createMarketingUnsubscribeToken(input: MarketingUnsubscribeInput, secret: string, nowMs: number): string {
  const activeSecret = requireSecret(secret)
  if (!Number.isSafeInteger(nowMs) || nowMs < 0) throw new Error('invalid unsubscribe token clock')
  const payload: MarketingUnsubscribePayload = {
    version: 'v1',
    workspaceId: normalizeWorkspaceId(input.workspaceId),
    recipientHash: hashRecipientEmail(input.recipientEmail, activeSecret),
    scope: 'marketing',
    expiresAt: nowMs + MARKETING_UNSUBSCRIBE_TTL_MS,
  }
  const encodedPayload = encode(JSON.stringify(payload))
  return `v1.${encodedPayload}.${sign('v1', encodedPayload, activeSecret)}`
}

/** Verifies signature, payload shape, scope and expiry; invalid tokens return null. */
export function verifyMarketingUnsubscribeToken(token: string, secret: string, nowMs: number): MarketingUnsubscribePayload | null {
  if (!token || !Number.isSafeInteger(nowMs) || nowMs < 0) return null
  let activeSecret: string
  try {
    activeSecret = requireSecret(secret)
  } catch {
    return null
  }

  const parts = token.split('.')
  if (parts.length !== 3 || parts[0] !== 'v1' || !parts[1] || !parts[2]) return null
  const [version, encodedPayload, providedSignature] = parts
  const expectedSignature = sign(version, encodedPayload, activeSecret)
  const expectedBuffer = Buffer.from(expectedSignature, 'base64url')
  const providedBuffer = Buffer.from(providedSignature, 'base64url')
  if (expectedBuffer.length !== providedBuffer.length || !timingSafeEqual(expectedBuffer, providedBuffer)) return null

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as Partial<MarketingUnsubscribePayload>
    const expiresAt = payload.expiresAt
    if (payload.version !== 'v1' || typeof payload.workspaceId !== 'string' || typeof payload.recipientHash !== 'string' || !/^[a-f0-9]{64}$/.test(payload.recipientHash) || payload.scope !== 'marketing' || typeof expiresAt !== 'number' || !Number.isSafeInteger(expiresAt) || nowMs >= expiresAt) return null
    return { ...payload, expiresAt } as MarketingUnsubscribePayload
  } catch {
    return null
  }
}
