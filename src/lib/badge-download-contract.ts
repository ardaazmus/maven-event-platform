export const BADGE_DOWNLOAD_MIN_TTL_SECONDS = 60
export const BADGE_DOWNLOAD_MAX_TTL_SECONDS = 900
export const BADGE_DOWNLOAD_DEFAULT_TTL_SECONDS = 300

export type BadgeDownloadRequester = Readonly<{
  authenticated: boolean
  userId: string
  workspaceId: string
  formId: string
  canReadBadge: boolean
}>

export type BadgeDownloadArtifact = Readonly<{
  artifactId: string
  workspaceId: string
  formId: string
  visibility: 'private'
  status: 'READY' | 'PROCESSING' | 'BLOCKED'
}>

export type BadgeDownloadDescriptor = Readonly<{
  method: 'authenticated-stream'
  artifactId: string
  scopeKey: string
  expiresAtMs: number
}>

export type BadgeDownloadValidationCode =
  | 'OK'
  | 'AUTH_REQUIRED'
  | 'BADGE_READ_FORBIDDEN'
  | 'SCOPE_MISMATCH'
  | 'PRIVATE_ONLY'
  | 'ARTIFACT_NOT_READY'
  | 'TTL_INVALID'
  | 'IDENTIFIER_INVALID'

function isSafeIdentifier(value: string) {
  return Boolean(value.trim()) && !/[\\/:\s]/u.test(value)
}

export function authorizeBadgeDownload(input: Readonly<{
  requester: BadgeDownloadRequester
  artifact: BadgeDownloadArtifact
  nowMs: number
  ttlSeconds?: number
}>): { ok: true; descriptor: BadgeDownloadDescriptor } | { ok: false; code: BadgeDownloadValidationCode } {
  const { requester, artifact } = input
  if (!requester.authenticated || !requester.userId.trim()) return { ok: false, code: 'AUTH_REQUIRED' }
  if (!requester.canReadBadge) return { ok: false, code: 'BADGE_READ_FORBIDDEN' }
  if (requester.workspaceId !== artifact.workspaceId || requester.formId !== artifact.formId) return { ok: false, code: 'SCOPE_MISMATCH' }
  if (artifact.visibility !== 'private') return { ok: false, code: 'PRIVATE_ONLY' }
  if (artifact.status !== 'READY') return { ok: false, code: 'ARTIFACT_NOT_READY' }
  if (!Number.isFinite(input.nowMs) || input.nowMs < 0) return { ok: false, code: 'TTL_INVALID' }

  const ttlSeconds = input.ttlSeconds ?? BADGE_DOWNLOAD_DEFAULT_TTL_SECONDS
  if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds < BADGE_DOWNLOAD_MIN_TTL_SECONDS || ttlSeconds > BADGE_DOWNLOAD_MAX_TTL_SECONDS) {
    return { ok: false, code: 'TTL_INVALID' }
  }
  if (![requester.workspaceId, requester.formId, artifact.artifactId].every(isSafeIdentifier)) return { ok: false, code: 'IDENTIFIER_INVALID' }

  return {
    ok: true,
    descriptor: {
      method: 'authenticated-stream',
      artifactId: artifact.artifactId,
      scopeKey: `badge:${artifact.workspaceId}:${artifact.formId}:${artifact.artifactId}`,
      expiresAtMs: input.nowMs + ttlSeconds * 1000,
    },
  }
}
