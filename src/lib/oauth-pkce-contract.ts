import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

export const OAUTH_CODE_CHALLENGE_METHOD = 'S256' as const
export const OAUTH_CALLBACK_PATH = '/api/integrations/parasut/oauth/callback'
export const OAUTH_TRANSACTION_TTL_MS = 10 * 60 * 1000

export type OAuthPkceTransaction = Readonly<{
  transactionId: string
  tenantId: string
  workspaceId: string
  actorId: string
  redirectUri: string
  state: string
  stateHash: string
  verifierHash: string
  codeChallenge: string
  codeChallengeMethod: typeof OAUTH_CODE_CHALLENGE_METHOD
  expiresAtMs: number
  consumedAtMs: number | null
}>

export type OAuthPkceResult =
  | { ok: true; transaction: OAuthPkceTransaction }
  | {
      ok: false
      reason:
        | 'input_invalid'
        | 'id_invalid'
        | 'redirect_invalid'
        | 'state_invalid'
        | 'verifier_invalid'
        | 'time_invalid'
        | 'state_mismatch'
        | 'tenant_mismatch'
        | 'workspace_mismatch'
        | 'actor_mismatch'
        | 'redirect_mismatch'
        | 'expired'
        | 'already_consumed'
        | 'code_invalid'
    }

export type OAuthCallbackInput = Readonly<{
  transaction: OAuthPkceTransaction
  state: string
  code: string
  nowMs: number
  tenantId: string
  workspaceId: string
  actorId: string
  redirectUri: string
}>

const SAFE_ID_PATTERN = /^[A-Za-z0-9._-]{1,120}$/
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/

function safeId(value: unknown) {
  return typeof value === 'string' && SAFE_ID_PATTERN.test(value.trim()) ? value.trim() : null
}

function safeTime(value: unknown) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null
}

function hash(value: string) {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

function equalHash(left: string, right: string) {
  const leftBytes = Buffer.from(left, 'hex')
  const rightBytes = Buffer.from(right, 'hex')
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes)
}

function validSecretMaterial(value: unknown, minLength: number) {
  return typeof value === 'string' && value.length >= minLength && value.length <= 256 && BASE64URL_PATTERN.test(value)
}

function normalizeRedirect(value: unknown) {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.pathname !== OAUTH_CALLBACK_PATH || url.search || url.hash || url.username || url.password) return null
    return url.toString()
  } catch {
    return null
  }
}

/** Creates the one-time PKCE material; the verifier stays server-private and only its hash is persisted. */
export function createOAuthPkceTransaction(input: Readonly<{
  transactionId: string
  tenantId: string
  workspaceId: string
  actorId: string
  redirectUri: string
  state: string
  codeVerifier: string
  nowMs: number
  expiresAtMs?: number
}>): OAuthPkceResult {
  const transactionId = safeId(input.transactionId)
  const tenantId = safeId(input.tenantId)
  const workspaceId = safeId(input.workspaceId)
  const actorId = safeId(input.actorId)
  const redirectUri = normalizeRedirect(input.redirectUri)
  if (!transactionId || !tenantId || !workspaceId || !actorId) return { ok: false, reason: 'id_invalid' }
  if (!redirectUri) return { ok: false, reason: 'redirect_invalid' }
  if (!validSecretMaterial(input.state, 32)) return { ok: false, reason: 'state_invalid' }
  if (!validSecretMaterial(input.codeVerifier, 43)) return { ok: false, reason: 'verifier_invalid' }
  const nowMs = safeTime(input.nowMs)
  const expiresAtMs = input.expiresAtMs === undefined ? (nowMs ?? 0) + OAUTH_TRANSACTION_TTL_MS : safeTime(input.expiresAtMs)
  if (nowMs === null || expiresAtMs === null || expiresAtMs <= nowMs) return { ok: false, reason: 'time_invalid' }
  const codeChallenge = Buffer.from(createHash('sha256').update(input.codeVerifier, 'ascii').digest()).toString('base64url')
  return {
    ok: true,
    transaction: {
      transactionId,
      tenantId,
      workspaceId,
      actorId,
      redirectUri,
      state: input.state,
      stateHash: hash(input.state),
      verifierHash: hash(input.codeVerifier),
      codeChallenge,
      codeChallengeMethod: OAUTH_CODE_CHALLENGE_METHOD,
      expiresAtMs,
      consumedAtMs: null,
    },
  }
}

/** Builds only public authorization parameters; state/verifier secrets never appear in the URL. */
export function buildOAuthAuthorizationUrl(input: Readonly<{ authorizationEndpoint: string; clientId: string; transaction: OAuthPkceTransaction }>): URL {
  const clientId = safeId(input.clientId)
  if (!clientId) throw new Error('oauth client id is invalid')
  const url = new URL(input.authorizationEndpoint)
  if (url.protocol !== 'https:') throw new Error('oauth authorization endpoint must use https')
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', input.transaction.redirectUri)
  url.searchParams.set('state', input.transaction.state)
  url.searchParams.set('code_challenge', input.transaction.codeChallenge)
  url.searchParams.set('code_challenge_method', input.transaction.codeChallengeMethod)
  return url
}

/** Validates callback binding and returns only non-secret routing metadata for the next server step. */
export function verifyOAuthCallback(input: OAuthCallbackInput): OAuthPkceResult | { ok: true; consumedAtMs: number; code: string } {
  const transaction = input.transaction
  const tenantId = safeId(input.tenantId)
  const workspaceId = safeId(input.workspaceId)
  const actorId = safeId(input.actorId)
  const redirectUri = normalizeRedirect(input.redirectUri)
  const nowMs = safeTime(input.nowMs)
  if (!tenantId || !workspaceId || !actorId) return { ok: false, reason: 'id_invalid' }
  if (!redirectUri || redirectUri !== transaction.redirectUri) return { ok: false, reason: 'redirect_mismatch' }
  if (transaction.tenantId !== tenantId) return { ok: false, reason: 'tenant_mismatch' }
  if (transaction.workspaceId !== workspaceId) return { ok: false, reason: 'workspace_mismatch' }
  if (transaction.actorId !== actorId) return { ok: false, reason: 'actor_mismatch' }
  if (transaction.consumedAtMs !== null) return { ok: false, reason: 'already_consumed' }
  if (nowMs === null || transaction.expiresAtMs <= nowMs) return { ok: false, reason: 'expired' }
  if (!validSecretMaterial(input.state, 32) || !equalHash(transaction.stateHash, hash(input.state))) return { ok: false, reason: 'state_mismatch' }
  if (typeof input.code !== 'string' || input.code.length < 8 || input.code.length > 512 || /\s/.test(input.code)) return { ok: false, reason: 'code_invalid' }
  return { ok: true, consumedAtMs: nowMs, code: input.code }
}

/** Generates server-side PKCE verifier material for a new transaction. */
export function generateOAuthCodeVerifier() {
  return randomBytes(32).toString('base64url')
}
