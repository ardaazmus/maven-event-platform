export const BADGE_PERSON_FIELD_KEYS = ['firstName', 'lastName', 'title', 'company'] as const
export const BADGE_CONTEXT_FIELD_KEYS = ['eventName', 'eventDate', 'registrationType'] as const

export type BadgePersonFieldKey = (typeof BADGE_PERSON_FIELD_KEYS)[number]
export type BadgeContextFieldKey = (typeof BADGE_CONTEXT_FIELD_KEYS)[number]
export type BadgeOutputFieldKey = BadgePersonFieldKey | BadgeContextFieldKey

export type BadgeFieldSource = Readonly<{
  fieldKey: string
  type?: string | null
  hidden?: boolean
  adminOnly?: boolean
  encrypted?: boolean
}>

export type BadgePersonFieldMapping = Readonly<Partial<Record<BadgePersonFieldKey, string>>>

export type BadgeProjectionContext = Readonly<Partial<Record<BadgeContextFieldKey, string | null | undefined>>>

export type BadgeProjection = Readonly<Partial<Record<BadgeOutputFieldKey, string>>>

const MAX_BADGE_TEXT_LENGTH = 160
const DISALLOWED_FIELD_PATTERN = /(?:email|e[-_ ]?posta|phone|telefon|payment|ödeme|card|kart|password|parola|secret|token|admin|internal|private)/iu
const DISALLOWED_TYPE_PATTERN = /(?:email|phone|tel|payment|card|password|secret|token)/iu

function isSafePublicField(field: BadgeFieldSource) {
  return Boolean(
    field.fieldKey.trim() &&
      !field.hidden &&
      !field.adminOnly &&
      !field.encrypted &&
      !DISALLOWED_FIELD_PATTERN.test(field.fieldKey) &&
      !DISALLOWED_TYPE_PATTERN.test(field.type ?? ''),
  )
}

function sanitizeBadgeText(value: string) {
  return value
    .normalize('NFC')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_BADGE_TEXT_LENGTH)
}

export function createBadgePersonFieldMapping(
  fields: ReadonlyArray<BadgeFieldSource>,
  requested: BadgePersonFieldMapping,
): BadgePersonFieldMapping {
  const safeFieldKeys = new Set(fields.filter(isSafePublicField).map(field => field.fieldKey))
  const mapping: Partial<Record<BadgePersonFieldKey, string>> = {}

  for (const key of BADGE_PERSON_FIELD_KEYS) {
    const sourceFieldKey = requested[key]?.trim()
    if (sourceFieldKey && safeFieldKeys.has(sourceFieldKey)) mapping[key] = sourceFieldKey
  }

  return mapping
}

function readMappedText(answers: Readonly<Record<string, unknown>>, sourceFieldKey: string | undefined) {
  if (!sourceFieldKey || !Object.prototype.hasOwnProperty.call(answers, sourceFieldKey)) return undefined
  const value = answers[sourceFieldKey]
  return typeof value === 'string' ? sanitizeBadgeText(value) || undefined : undefined
}

export function projectBadgeFields(input: Readonly<{
  answers: Readonly<Record<string, unknown>>
  mapping: BadgePersonFieldMapping
  context?: BadgeProjectionContext
}>): BadgeProjection {
  const projection: Partial<Record<BadgeOutputFieldKey, string>> = {}

  for (const key of BADGE_PERSON_FIELD_KEYS) {
    const value = readMappedText(input.answers, input.mapping[key])
    if (value) projection[key] = value
  }

  for (const key of BADGE_CONTEXT_FIELD_KEYS) {
    const value = input.context?.[key]
    if (typeof value === 'string') {
      const safeValue = sanitizeBadgeText(value)
      if (safeValue) projection[key] = safeValue
    }
  }

  return projection
}
