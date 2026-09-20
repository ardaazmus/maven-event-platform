/**
 * EFPS adapter sözleşmesi (F5-R2).
 *
 * Maven, EFPS plan/geometri/envanter gerçeğini kopyalamaz; yalnız
 * `ExternalIdMapping` satırlarıyla kanonik referans tutar ve EFPS'i
 * API/event adapter sınırından tüketir. Bu helper pure'dur: DB, fetch
 * ve framework importu yoktur.
 *
 * Kaynak sözlüğü (sourceSystem daima `efps`):
 * - sourceType: event | occurrence | venue | hall | plan | inventory | attendee
 * - coreType: event | occurrence | person | registration | ticket
 */

export const EFPS_SOURCE_SYSTEM = 'efps' as const

export const EFPS_SOURCE_TYPES = [
  'event',
  'occurrence',
  'venue',
  'hall',
  'plan',
  'inventory',
  'attendee',
] as const
export type EfpsSourceType = (typeof EFPS_SOURCE_TYPES)[number]

export const EFPS_CORE_TYPES = ['event', 'occurrence', 'person', 'registration', 'ticket'] as const
export type EfpsCoreType = (typeof EFPS_CORE_TYPES)[number]

export type EfpsMappingRef = {
  workspaceId: string
  sourceType: string
  sourceId: string
  coreType: string
  coreId: string
}

export type EfpsCanonicalReference = {
  organizationId: string
  eventId: string
  occurrenceId?: string
  venueId?: string
  hallId?: string
  eventPlanId?: string
  personId?: string
  registrationId?: string
  ticketId?: string
}

function isSafeId(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '' && !value.includes('/') && !value.includes('\\')
}

export function isEfpsSourceType(value: unknown): value is EfpsSourceType {
  return typeof value === 'string' && (EFPS_SOURCE_TYPES as readonly string[]).includes(value)
}

export function isEfpsCoreType(value: unknown): value is EfpsCoreType {
  return typeof value === 'string' && (EFPS_CORE_TYPES as readonly string[]).includes(value)
}

/** Mapping key: `efps:<workspaceId>:<sourceType>:<sourceId>`; geçersizse null (fail-closed). */
export function buildEfpsMappingKey(ref: Pick<EfpsMappingRef, 'workspaceId' | 'sourceType' | 'sourceId'>): string | null {
  if (!isSafeId(ref.workspaceId) || !isEfpsSourceType(ref.sourceType) || !isSafeId(ref.sourceId)) return null
  return `${EFPS_SOURCE_SYSTEM}:${ref.workspaceId}:${ref.sourceType}:${ref.sourceId}`
}

/** Key'i geri çöz; bozuk/geçersiz key null döner. */
export function parseEfpsMappingKey(key: unknown): { workspaceId: string; sourceType: EfpsSourceType; sourceId: string } | null {
  if (typeof key !== 'string') return null
  const parts = key.split(':')
  if (parts.length !== 4 || parts[0] !== EFPS_SOURCE_SYSTEM) return null
  const [, workspaceId, sourceType, sourceId] = parts
  if (!isSafeId(workspaceId) || !isEfpsSourceType(sourceType) || !isSafeId(sourceId)) return null
  return { workspaceId, sourceType, sourceId }
}

/** Mapping satırı üçlüsü (kaynak + çekirdek) geçerli mi? */
export function isValidEfpsMapping(ref: EfpsMappingRef): boolean {
  return (
    buildEfpsMappingKey(ref) !== null && isEfpsCoreType(ref.coreType) && isSafeId(ref.coreId)
  )
}

/**
 * Kanonik referans doğrulaması: organizationId + eventId zorunlu,
 * opsiyonel alanlar verilmişse güvenli ID olmalı. Geometri/envanter
 * yükü bu referansın parçası olamaz (ayrı EFPS çağrısı gerekir).
 */
export function validateEfpsCanonicalReference(ref: EfpsCanonicalReference): { ok: true } | { ok: false; code: string } {
  if (!isSafeId(ref.organizationId) || !isSafeId(ref.eventId)) {
    return { ok: false, code: 'SCOPE_REQUIRED' }
  }
  for (const field of ['occurrenceId', 'venueId', 'hallId', 'eventPlanId', 'personId', 'registrationId', 'ticketId'] as const) {
    const value = ref[field]
    if (value !== undefined && !isSafeId(value)) return { ok: false, code: 'REFERENCE_INVALID' }
  }
  return { ok: true }
}
