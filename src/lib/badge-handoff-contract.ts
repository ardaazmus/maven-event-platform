export const BADGE_HANDOFF_FORMATS = ['ZIP', 'COMBINED_PDF', 'MANIFEST'] as const
export type BadgeHandoffFormat = (typeof BADGE_HANDOFF_FORMATS)[number]

export type BadgeHandoffDescriptor = Readonly<{
  destination: 'LOCAL_DOWNLOAD'
  requiresAuthentication: true
  workspaceId: string
  formId: string
  jobId: string
  availableFormats: ReadonlyArray<BadgeHandoffFormat>
  expiresAtMs: number
}>

export type BadgeHandoffValidationCode =
  | 'AUTH_REQUIRED'
  | 'BADGE_READ_FORBIDDEN'
  | 'SCOPE_MISMATCH'
  | 'PREFLIGHT_NOT_READY'
  | 'NO_EXPORT_FORMAT'
  | 'FORMAT_FILE_INVALID'
  | 'TTL_INVALID'

function isSafeIdentifier(value: string) {
  return Boolean(value.trim()) && !/[\\/:\s]/u.test(value)
}

function isSafePdfOrArchiveName(value: string) {
  return Boolean(value.trim()) && !/[\\/:*?"<>|\u0000-\u001f]/u.test(value) && /\.(?:pdf|zip|json)$/iu.test(value)
}

export function createBadgeHandoffDescriptor(input: Readonly<{
  authenticated: boolean
  userId: string
  canReadBadge: boolean
  workspaceId: string
  formId: string
  jobId: string
  preflightStatus: 'PASS' | 'WARN_REQUIRES_CONFIRMATION' | 'BLOCKED' | 'PRINT_PROOF_REQUIRED'
  artifactWorkspaceId: string
  artifactFormId: string
  artifactFiles: Readonly<Partial<Record<BadgeHandoffFormat, string>>>
  nowMs: number
  ttlSeconds?: number
}>): { ok: true; descriptor: BadgeHandoffDescriptor } | { ok: false; code: BadgeHandoffValidationCode } {
  if (!input.authenticated || !input.userId.trim()) return { ok: false, code: 'AUTH_REQUIRED' }
  if (!input.canReadBadge) return { ok: false, code: 'BADGE_READ_FORBIDDEN' }
  if (input.workspaceId !== input.artifactWorkspaceId || input.formId !== input.artifactFormId || ![input.workspaceId, input.formId, input.jobId].every(isSafeIdentifier)) {
    return { ok: false, code: 'SCOPE_MISMATCH' }
  }
  if (input.preflightStatus !== 'PASS') return { ok: false, code: 'PREFLIGHT_NOT_READY' }
  if (!Number.isFinite(input.nowMs) || input.nowMs < 0) return { ok: false, code: 'TTL_INVALID' }
  const ttlSeconds = input.ttlSeconds ?? 300
  if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds < 60 || ttlSeconds > 900) return { ok: false, code: 'TTL_INVALID' }

  for (const format of BADGE_HANDOFF_FORMATS) {
    const file = input.artifactFiles[format]
    if (file && !isSafePdfOrArchiveName(file)) return { ok: false, code: 'FORMAT_FILE_INVALID' }
  }
  const availableFormats = BADGE_HANDOFF_FORMATS.filter(format => Boolean(input.artifactFiles[format]))
  if (!availableFormats.length) return { ok: false, code: 'NO_EXPORT_FORMAT' }

  return {
    ok: true,
    descriptor: {
      destination: 'LOCAL_DOWNLOAD',
      requiresAuthentication: true,
      workspaceId: input.workspaceId,
      formId: input.formId,
      jobId: input.jobId,
      availableFormats,
      expiresAtMs: input.nowMs + ttlSeconds * 1000,
    },
  }
}
