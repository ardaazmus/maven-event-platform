import type { NextRequest } from 'next/server'
import { randomBytes } from 'node:crypto'
import { buildParasutAuthorizationUrl, createParasutOAuthState, PARASUT_OAUTH_CALLBACK_PATH, PARASUT_OAUTH_STATE_TTL_MS } from '@/lib/parasut-oauth'

export type ParasutOAuthConfig = {
  clientId: string
  clientSecret: string
  redirectUri: string
}

export function readParasutOAuthConfig(env: NodeJS.ProcessEnv = process.env): ParasutOAuthConfig {
  const clientId = env.PARASUT_OAUTH_CLIENT_ID?.trim()
  const clientSecret = env.PARASUT_OAUTH_CLIENT_SECRET
  const redirectUri = env.MAVENFORMS_PARASUT_REDIRECT_URI?.trim()
  if (!clientId || !clientSecret || !redirectUri) throw new Error('Paraşüt OAuth configuration is incomplete')

  const url = new URL(redirectUri)
  if (url.protocol !== 'https:' || url.pathname !== PARASUT_OAUTH_CALLBACK_PATH || url.search || url.hash || url.username || url.password) throw new Error('Paraşüt OAuth redirect URI is invalid')
  return { clientId, clientSecret, redirectUri: url.toString() }
}

/** Allows only same-origin state-changing requests; callback is GET and uses OAuth state instead. */
export function assertParasutSameOrigin(req: NextRequest): void {
  const origin = req.headers.get('origin')
  if (!origin) throw new Error('origin is required')
  const expected = process.env.MAVENFORMS_APP_ORIGIN?.trim() || req.nextUrl.origin
  if (new URL(origin).origin !== new URL(expected).origin) throw new Error('origin is not allowed')
}

export function createParasutAuthorizationCommand(input: { workspaceId: string; userId: string; redirectUri: string; clientId: string; now?: Date }) {
  const now = input.now || new Date()
  const state = randomBytes(32).toString('base64url')
  const transaction = createParasutOAuthState({
    workspaceId: input.workspaceId,
    userId: input.userId,
    redirectUri: input.redirectUri,
    state,
    expiresAt: new Date(now.getTime() + PARASUT_OAUTH_STATE_TTL_MS),
  })
  return { transaction, authorizationUrl: buildParasutAuthorizationUrl({ clientId: input.clientId, state, redirectUri: input.redirectUri }).toString() }
}

export function safeParasutResultUrl(redirectUri: string, result: 'connected' | 'error'): string {
  const url = new URL(redirectUri)
  url.pathname = '/'
  url.search = `?parasut=${result}`
  url.hash = ''
  return url.toString()
}
