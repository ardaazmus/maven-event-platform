import { createHash, timingSafeEqual } from 'node:crypto'

export const PARASUT_OAUTH_AUTHORIZE_URL = 'https://api.parasut.com/oauth/authorize'
export const PARASUT_OAUTH_TOKEN_URL = 'https://api.parasut.com/oauth/token'
export const PARASUT_OAUTH_CALLBACK_PATH = '/api/integrations/parasut/oauth/callback'
export const PARASUT_OAUTH_STATE_TTL_MS = 10 * 60 * 1000

type OAuthStateInput = {
  workspaceId: string
  userId: string
  redirectUri: string
  expiresAt: Date
  state: string
}

export type ParasutOAuthState = OAuthStateInput & {
  stateHash: string
  bindingHash: string
  status: 'pending' | 'consumed' | 'failed' | 'expired'
  consumedAt?: Date
}

export type ParasutOAuthStateRecord = Omit<ParasutOAuthState, 'state' | 'consumedAt'> & { consumedAt: Date | null }

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

function sameHash(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'hex')
  const rightBuffer = Buffer.from(right, 'hex')
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

function bindingValue(state: Pick<OAuthStateInput, 'workspaceId' | 'userId' | 'redirectUri'>): string {
  return `${state.workspaceId}:${state.userId}:${state.redirectUri}`
}

/** Creates the server-side transaction values; the state itself is never a credential. */
export function createParasutOAuthState(input: OAuthStateInput): ParasutOAuthState {
  if (!input.workspaceId || !input.userId || !input.redirectUri || !input.state) throw new Error('invalid oauth state input')
  if (!/^https:\/\//.test(input.redirectUri) || !input.redirectUri.endsWith(PARASUT_OAUTH_CALLBACK_PATH)) throw new Error('invalid oauth redirect')

  return {
    ...input,
    stateHash: sha256(input.state),
    bindingHash: sha256(bindingValue(input)),
    status: 'pending',
  }
}

/** Consumes one pending transaction without persisting the authorization code. */
export function consumeParasutOAuthState(transaction: ParasutOAuthStateRecord, state: string, now = new Date()): Pick<ParasutOAuthState, 'status' | 'consumedAt'> {
  if (transaction.status === 'consumed') throw new Error('oauth state already consumed')
  if (transaction.status !== 'pending') throw new Error('oauth state is not pending')
  if (transaction.expiresAt <= now) throw new Error('oauth state expired')
  if (!sameHash(transaction.stateHash, sha256(state))) throw new Error('invalid state')
  if (!sameHash(transaction.bindingHash, sha256(bindingValue(transaction)))) throw new Error('oauth state workspace binding failed')

  return { status: 'consumed', consumedAt: now }
}

/** Builds only the provider authorization URL. Server credentials never enter the URL. */
export function buildParasutAuthorizationUrl(input: { clientId: string; state: string; redirectUri: string }): URL {
  const url = new URL(PARASUT_OAUTH_AUTHORIZE_URL)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', input.clientId)
  url.searchParams.set('redirect_uri', input.redirectUri)
  url.searchParams.set('state', input.state)
  return url
}

export function rejectParasutGrant(grantType: string): never {
  throw new Error(`${grantType} grant is rejected; authorization code is required`)
}

/** Creates an in-memory token request for the server boundary; never log or serialize this object to clients. */
export function buildParasutTokenExchangeRequest(input: {
  code?: string
  clientId?: string
  clientSecret?: string
  redirectUri?: string
  grantType?: string
}): { url: string; method: 'POST'; headers: Record<string, string>; body: URLSearchParams } {
  if (input.grantType && input.grantType !== 'authorization_code') rejectParasutGrant(input.grantType)
  if (!input.code || !input.clientId || !input.clientSecret || !input.redirectUri) throw new Error('oauth token exchange input is incomplete')

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: input.clientId,
    client_secret: input.clientSecret,
    code: input.code,
    redirect_uri: input.redirectUri,
  })
  return { url: PARASUT_OAUTH_TOKEN_URL, method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body }
}

export type ParasutTokenSet = {
  accessToken: string
  refreshToken: string
  expiresInSeconds: number
}

/** Parses only the minimum token fields and rejects incomplete provider responses. */
export function parseParasutTokenResponse(value: unknown): ParasutTokenSet {
  if (!value || typeof value !== 'object') throw new Error('invalid oauth token response')
  const record = value as Record<string, unknown>
  if (typeof record.access_token !== 'string' || !record.access_token) throw new Error('oauth response access_token is required')
  if (typeof record.refresh_token !== 'string' || !record.refresh_token) throw new Error('oauth response refresh_token is required')
  if (typeof record.expires_in !== 'number' || !Number.isFinite(record.expires_in) || record.expires_in <= 0) throw new Error('oauth response expires_in is required')

  return { accessToken: record.access_token, refreshToken: record.refresh_token, expiresInSeconds: record.expires_in }
}
