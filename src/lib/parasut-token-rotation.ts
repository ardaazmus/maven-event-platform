import { encryptParasutCredential } from '@/lib/parasut-credentials'
import { db } from '@/lib/db'
import { PARASUT_OAUTH_TOKEN_URL, type ParasutTokenSet } from '@/lib/parasut-oauth'

export const PARASUT_REFRESH_SKEW_MS = 5 * 60 * 1000

export function isParasutRefreshDue(expiresAt: Date, now = new Date(), skewMs = PARASUT_REFRESH_SKEW_MS): boolean {
  return expiresAt.getTime() - now.getTime() <= skewMs
}

/** Builds a refresh-grant request for the server worker; never send it to a browser. */
export function buildParasutRefreshRequest(input: { clientId: string; clientSecret: string; refreshToken: string }): { url: string; method: 'POST'; headers: Record<string, string>; body: URLSearchParams } {
  if (!input.clientId || !input.clientSecret || !input.refreshToken) throw new Error('refresh request input is incomplete')
  return {
    url: PARASUT_OAUTH_TOKEN_URL,
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', client_id: input.clientId, client_secret: input.clientSecret, refresh_token: input.refreshToken }),
  }
}

export type ParasutRotationResult = { status: 'rotated'; nextVersion: number } | { status: 'stale' }

/** Persists a rotation only if this worker still owns the expected credential version. */
export async function persistParasutCredentialRotation(input: { connectionId: string; workspaceId: string; expectedVersion: number; envelope: string }): Promise<boolean> {
  const result = await db.parasutConnection.updateMany({
    where: { id: input.connectionId, workspaceId: input.workspaceId, credentialVersion: input.expectedVersion, status: { in: ['connected_pending_company', 'active'] } },
    data: { credentialsEnvelope: input.envelope, credentialVersion: { increment: 1 } },
  })
  return result.count === 1
}

/**
 * Encrypts and conditionally persists one rotated token set. The persistence
 * callback must perform an atomic update guarded by the expected version.
 */
export async function prepareParasutCredentialRotation(input: {
  expectedVersion: number
  currentVersion: number
  tokenSet: ParasutTokenSet
  env?: NodeJS.ProcessEnv
  now?: Date
  persist: (envelope: string, nextVersion: number) => Promise<boolean>
}): Promise<ParasutRotationResult> {
  if (input.expectedVersion !== input.currentVersion) return { status: 'stale' }
  const now = input.now || new Date()
  const accessTokenExpiresAt = new Date(now.getTime() + input.tokenSet.expiresInSeconds * 1000).toISOString()
  const envelope = encryptParasutCredential(JSON.stringify({ accessToken: input.tokenSet.accessToken, refreshToken: input.tokenSet.refreshToken, accessTokenExpiresAt }), input.env)
  const nextVersion = input.currentVersion + 1
  const persisted = await input.persist(envelope, nextVersion)
  return persisted ? { status: 'rotated', nextVersion } : { status: 'stale' }
}
