import type { BadgeProjection } from './badge-field-mapping'

const BADGE_SNAPSHOT_ALLOWED_KEYS = ['firstName', 'lastName', 'title', 'company', 'eventName', 'eventDate', 'registrationType'] as const

export type BadgeSubmissionSnapshot = Readonly<{
  snapshotId: string
  workspaceId: string
  formId: string
  submissionId: string
  formVersionId: string
  capturedAtMs: number
  values: BadgeProjection
}>

export type BadgeSnapshotValidationCode =
  | 'OK'
  | 'IDENTIFIER_INVALID'
  | 'CAPTURE_TIME_INVALID'
  | 'VALUE_INVALID'
  | 'SCOPE_MISMATCH'

function isSafeIdentifier(value: string) {
  return Boolean(value.trim()) && !/[\\/:\s]/u.test(value)
}

function copyBadgeValues(values: Readonly<Record<string, unknown>>): BadgeProjection | null {
  const copy: Record<string, string> = {}
  for (const key of BADGE_SNAPSHOT_ALLOWED_KEYS) {
    const value = values[key]
    if (value !== undefined && typeof value !== 'string') return null
    if (typeof value === 'string' && value.trim()) copy[key] = value.normalize('NFC')
  }
  return Object.freeze(copy) as BadgeProjection
}

export function createBadgeSubmissionSnapshot(input: Readonly<{
  snapshotId: string
  workspaceId: string
  formId: string
  submissionId: string
  formVersionId: string
  capturedAtMs: number
  values: Readonly<Record<string, unknown>>
}>): { ok: true; snapshot: BadgeSubmissionSnapshot } | { ok: false; code: BadgeSnapshotValidationCode } {
  if (![input.snapshotId, input.workspaceId, input.formId, input.submissionId, input.formVersionId].every(isSafeIdentifier)) {
    return { ok: false, code: 'IDENTIFIER_INVALID' }
  }
  if (!Number.isSafeInteger(input.capturedAtMs) || input.capturedAtMs < 0) return { ok: false, code: 'CAPTURE_TIME_INVALID' }
  const values = copyBadgeValues(input.values)
  if (!values) return { ok: false, code: 'VALUE_INVALID' }

  return {
    ok: true,
    snapshot: Object.freeze({
      snapshotId: input.snapshotId,
      workspaceId: input.workspaceId,
      formId: input.formId,
      submissionId: input.submissionId,
      formVersionId: input.formVersionId,
      capturedAtMs: input.capturedAtMs,
      values,
    }),
  }
}

export function assertBadgeSnapshotScope(snapshot: BadgeSubmissionSnapshot, expected: Readonly<{ workspaceId: string; formId: string; formVersionId: string }>) {
  return snapshot.workspaceId === expected.workspaceId && snapshot.formId === expected.formId && snapshot.formVersionId === expected.formVersionId
    ? { ok: true as const, code: 'OK' as const }
    : { ok: false as const, code: 'SCOPE_MISMATCH' as const }
}
