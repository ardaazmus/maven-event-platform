export type BadgeTemplateVersion = Readonly<{
  workspaceId: string
  formId: string
  templateId: string
  versionId: string
  createdAtMs: number
  immutable: true
}>

export type BadgeReprintPlan = Readonly<{
  sourceArtifactId: string
  sourceTemplateVersionId: string
  newTemplateVersionId: string
  newGenerationJobId: string
  newOutputId: string
  reason: string
  replacesSource: false
}>

export const BADGE_AUDIT_EVENT_CODES = [
  'TEMPLATE_CREATED',
  'REPRINT_REQUESTED',
  'EXPORT_CREATED',
  'DOWNLOAD_REQUESTED',
  'EXPORT_FAILED',
] as const
export type BadgeAuditEventCode = (typeof BADGE_AUDIT_EVENT_CODES)[number]

export type BadgeAuditEvent = Readonly<{
  eventId: string
  code: BadgeAuditEventCode
  workspaceId: string
  formId: string
  subjectId: string
  occurredAtMs: number
}>

export type BadgeVersionAuditValidationCode =
  | 'OK'
  | 'IDENTIFIER_INVALID'
  | 'TIME_INVALID'
  | 'REASON_REQUIRED'
  | 'SOURCE_OVERWRITE_FORBIDDEN'

function isSafeIdentifier(value: string) {
  return Boolean(value.trim()) && !/[\\/:\s]/u.test(value)
}

function validateIdentifiers(values: ReadonlyArray<string>) {
  return values.every(isSafeIdentifier)
}

export function createBadgeTemplateVersion(input: Readonly<{
  workspaceId: string
  formId: string
  templateId: string
  versionId: string
  createdAtMs: number
}>): { ok: true; version: BadgeTemplateVersion } | { ok: false; code: BadgeVersionAuditValidationCode } {
  if (!validateIdentifiers([input.workspaceId, input.formId, input.templateId, input.versionId])) return { ok: false, code: 'IDENTIFIER_INVALID' }
  if (!Number.isSafeInteger(input.createdAtMs) || input.createdAtMs < 0) return { ok: false, code: 'TIME_INVALID' }
  return { ok: true, version: { ...input, immutable: true } }
}

export function createBadgeReprintPlan(input: Readonly<{
  sourceArtifactId: string
  sourceTemplateVersionId: string
  newTemplateVersionId: string
  newGenerationJobId: string
  newOutputId: string
  reason: string
}>): { ok: true; plan: BadgeReprintPlan } | { ok: false; code: BadgeVersionAuditValidationCode } {
  if (!validateIdentifiers([input.sourceArtifactId, input.sourceTemplateVersionId, input.newTemplateVersionId, input.newGenerationJobId, input.newOutputId])) return { ok: false, code: 'IDENTIFIER_INVALID' }
  if (!input.reason.trim()) return { ok: false, code: 'REASON_REQUIRED' }
  if ([input.sourceArtifactId, input.sourceTemplateVersionId].includes(input.newOutputId) || input.newOutputId === input.newGenerationJobId) return { ok: false, code: 'SOURCE_OVERWRITE_FORBIDDEN' }
  return { ok: true, plan: { ...input, reason: input.reason.trim().slice(0, 200), replacesSource: false } }
}

export function createBadgeAuditEvent(input: Readonly<{
  eventId: string
  code: BadgeAuditEventCode
  workspaceId: string
  formId: string
  subjectId: string
  occurredAtMs: number
}>): { ok: true; event: BadgeAuditEvent } | { ok: false; code: BadgeVersionAuditValidationCode } {
  if (!BADGE_AUDIT_EVENT_CODES.includes(input.code) || !validateIdentifiers([input.eventId, input.workspaceId, input.formId, input.subjectId])) return { ok: false, code: 'IDENTIFIER_INVALID' }
  if (!Number.isSafeInteger(input.occurredAtMs) || input.occurredAtMs < 0) return { ok: false, code: 'TIME_INVALID' }
  return { ok: true, event: { ...input } }
}
