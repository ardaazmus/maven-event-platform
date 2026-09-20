/**
 * EF-08 mobil sözleşme (F9-R1).
 *
 * Mobil istemci saha istemcisidir: check-in, badge reprint, gate/device ve
 * floor operasyon sözleşmelerini tüketir; kendi Person/Registration gerçeğini
 * üretmez. Her operasyon idempotent zarf taşır; replay ve duplicate server
 * tarafında `opId` + zaman penceresiyle reddedilir.
 *
 * Bu helper pure'dur: DB, fetch ve framework importu yoktur. `nowMs` dışarıdan
 * girer, testler deterministtir.
 */

export const MOBILE_OPERATIONS = ['checkin.scan', 'badge.reprint', 'gate.ping', 'floor.holdSync'] as const
export type MobileOperation = (typeof MOBILE_OPERATIONS)[number]

/** Offline toleransı: 7 gün geçmiş, 5 dakika gelecek (checkin hattıyla aynı). */
export const MOBILE_PAST_WINDOW_MS = 7 * 24 * 3600_000
export const MOBILE_FUTURE_SKEW_MS = 5 * 60_000

export type MobileOperationEnvelope = {
  opId: string
  deviceId: string
  operation: string
  occurredAt: string
  refIds: Record<string, string>
}

export type MobileEnvelopeDecision =
  | { ok: true; operation: MobileOperation }
  | { ok: false; code: 'ENVELOPE_INVALID' | 'OPERATION_UNKNOWN' | 'TIMESTAMP_INVALID' | 'TIMESTAMP_FUTURE' | 'TIMESTAMP_TOO_OLD' | 'REF_INVALID' }

function isSafeId(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '' && value.length <= 128 && !value.includes('/') && !value.includes('\\')
}

export function isMobileOperation(value: unknown): value is MobileOperation {
  return typeof value === 'string' && (MOBILE_OPERATIONS as readonly string[]).includes(value)
}

/** Zarf doğrulaması: opId/deviceId + operasyon + zaman penceresi + referanslar. */
export function validateMobileEnvelope(input: MobileOperationEnvelope, nowMs: number): MobileEnvelopeDecision {
  if (!isSafeId(input.opId) || !isSafeId(input.deviceId)) return { ok: false, code: 'ENVELOPE_INVALID' }
  if (!isMobileOperation(input.operation)) return { ok: false, code: 'OPERATION_UNKNOWN' }
  const at = new Date(input.occurredAt).getTime()
  if (!Number.isSafeInteger(nowMs) || Number.isNaN(at)) return { ok: false, code: 'TIMESTAMP_INVALID' }
  if (at > nowMs + MOBILE_FUTURE_SKEW_MS) return { ok: false, code: 'TIMESTAMP_FUTURE' }
  if (at < nowMs - MOBILE_PAST_WINDOW_MS) return { ok: false, code: 'TIMESTAMP_TOO_OLD' }
  if (!input.refIds || typeof input.refIds !== 'object' || Array.isArray(input.refIds)) {
    return { ok: false, code: 'REF_INVALID' }
  }
  for (const [key, value] of Object.entries(input.refIds)) {
    if (!isSafeId(key) || !isSafeId(value)) return { ok: false, code: 'REF_INVALID' }
  }
  return { ok: true, operation: input.operation }
}

/**
 * Replay kuralı: aynı `opId` ikinci kez gelirse `duplicateOf` döner.
 * `seenOpIds` server tarafı kayıttır (idempotency penceresi).
 */
export function classifyMobileReplay(opId: string, seenOpIds: ReadonlySet<string>): { replay: boolean; duplicateOf: string | null } {
  if (seenOpIds.has(opId)) return { replay: true, duplicateOf: opId }
  return { replay: false, duplicateOf: null }
}

/**
 * Domain-gerçeği kuralı: mobil operasyonlar yalnız server ID'lerine referans
 * verir; Person/Registration/Ticket OLUŞTURMAZ. İzinli operasyon başına
 * zorunlu referans anahtarları:
 */
const REQUIRED_REFS: Record<MobileOperation, readonly string[]> = {
  'checkin.scan': ['credentialId'],
  'badge.reprint': ['badgeInstanceId'],
  'gate.ping': ['gateId'],
  'floor.holdSync': ['holdId'],
}

export function mobileRequiredRefs(operation: MobileOperation): readonly string[] {
  return REQUIRED_REFS[operation]
}

export function hasMobileRequiredRefs(operation: MobileOperation, refIds: Record<string, string>): boolean {
  return REQUIRED_REFS[operation].every((key) => isSafeId(refIds[key]))
}
