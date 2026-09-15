import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

const TOKEN_SEPARATOR = '.'
const TOKEN_VERSION = 1
export const PUBLIC_MEDIA_TOKEN_DEFAULT_TTL_MS = 60 * 60 * 1000
export const PUBLIC_MEDIA_TOKEN_MAX_TTL_MS = 24 * 60 * 60 * 1000

type PublicMediaTokenPayload = {
  v: number
  assetId: string
  scope: string
  iat: number
  exp: number
  jti: string
}

export type PublicMediaTokenOptions = {
  nowMs?: number
  ttlMs?: number
}

export type PublicMediaTokenVerifyOptions = {
  nowMs?: number
  revokedTokenIds?: readonly string[]
}

function secret() {
  return process.env.SESSION_SECRET || 'mavenforms-public-media-local-only'
}

function encode(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function decode(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function normalizeTtl(ttlMs: number | undefined) {
  return typeof ttlMs === 'number' && Number.isSafeInteger(ttlMs) && ttlMs > 0 && ttlMs <= PUBLIC_MEDIA_TOKEN_MAX_TTL_MS
    ? ttlMs
    : PUBLIC_MEDIA_TOKEN_DEFAULT_TTL_MS
}

function parsePayload(token: string): { payload: string; data: PublicMediaTokenPayload } | null {
  const parts = token.split(TOKEN_SEPARATOR)
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null
  try {
    const data = JSON.parse(decode(parts[0])) as Partial<PublicMediaTokenPayload>
    if (data.v !== TOKEN_VERSION || typeof data.assetId !== 'string' || !data.assetId || typeof data.scope !== 'string' || !data.scope || !Number.isSafeInteger(data.iat) || !Number.isSafeInteger(data.exp) || typeof data.jti !== 'string' || !data.jti) return null
    return { payload: parts[0], data: data as PublicMediaTokenPayload }
  } catch {
    return null
  }
}

function signature(payload: string) {
  return createHmac('sha256', secret()).update(payload).digest('base64url')
}

function signatureMatches(payload: string, provided: string) {
  const expectedBuffer = Buffer.from(signature(payload))
  const providedBuffer = Buffer.from(provided)
  return expectedBuffer.length === providedBuffer.length && timingSafeEqual(expectedBuffer, providedBuffer)
}

export function createPublicMediaToken(assetId: string, scope: string, options: PublicMediaTokenOptions = {}) {
  const nowMs = Number.isFinite(options.nowMs) ? options.nowMs as number : Date.now()
  const issuedAt = Math.floor(nowMs / 1000)
  const expiresAt = Math.floor((nowMs + normalizeTtl(options.ttlMs)) / 1000)
  const data: PublicMediaTokenPayload = { v: TOKEN_VERSION, assetId, scope, iat: issuedAt, exp: expiresAt, jti: randomBytes(12).toString('base64url') }
  const payload = encode(JSON.stringify(data))
  return `${payload}${TOKEN_SEPARATOR}${signature(payload)}`
}

export function getPublicMediaTokenPayload(token: string): PublicMediaTokenPayload | null {
  return parsePayload(token)?.data ?? null
}

export function getPublicMediaTokenAssetId(token: string) {
  return getPublicMediaTokenPayload(token)?.assetId ?? null
}

export function getPublicMediaTokenId(token: string) {
  return getPublicMediaTokenPayload(token)?.jti ?? null
}

export function isPublicMediaTokenRevoked(token: string, revokedTokenIds: readonly string[] = []) {
  const tokenId = getPublicMediaTokenId(token)
  return tokenId !== null && revokedTokenIds.includes(tokenId)
}

export function verifyPublicMediaToken(token: string, scope: string, options: PublicMediaTokenVerifyOptions = {}) {
  const parsed = parsePayload(token)
  const provided = token.split(TOKEN_SEPARATOR)[1]
  if (!parsed || !provided || parsed.data.scope !== scope || !signatureMatches(parsed.payload, provided)) return null
  const nowSeconds = Math.floor((Number.isFinite(options.nowMs) ? options.nowMs as number : Date.now()) / 1000)
  if (parsed.data.exp <= nowSeconds || parsed.data.iat > nowSeconds || isPublicMediaTokenRevoked(token, options.revokedTokenIds)) return null
  return parsed.data.assetId
}
