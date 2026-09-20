/**
 * Canonical intake sözleşmesi (EF-04A).
 *
 * Form, CSV, XLSX, API ve manuel girişler canonical Person/Registration
 * hattına girmeden önce aynı normalizasyondan geçer. Bu helper pure'dur:
 * DB, fetch ve framework importu yoktur.
 *
 * Kurallar:
 * - email: trim + lowercase; boş → null
 * - phone: boşluk/tire/parantez temizlenir, baştaki + korunur; boş → null
 * - fullName: trim + iç boşluklar teklenir
 * - dedupe anahtarı: email öncelikli, yoksa phone; ikisi de yoksa null
 *   (anahtarsız kayıt otomatik birleştirilemez)
 */

export const INTAKE_SOURCES = ['form', 'csv', 'xlsx', 'api', 'manual'] as const
export type IntakeSource = (typeof INTAKE_SOURCES)[number]

export function isIntakeSource(value: unknown): value is IntakeSource {
  return typeof value === 'string' && (INTAKE_SOURCES as readonly string[]).includes(value)
}

export function normalizeEmail(email: string | null | undefined): string | null {
  if (typeof email !== 'string') return null
  const cleaned = email.trim().toLowerCase()
  return cleaned === '' ? null : cleaned
}

export function normalizePhone(phone: string | null | undefined): string | null {
  if (typeof phone !== 'string') return null
  const trimmed = phone.trim()
  if (trimmed === '') return null
  const plus = trimmed.startsWith('+') ? '+' : ''
  const digits = trimmed.replace(/[^0-9]/g, '')
  if (digits === '') return null
  return `${plus}${digits}`
}

export function normalizeName(name: string | null | undefined): string {
  if (typeof name !== 'string') return ''
  return name.trim().replace(/\s+/g, ' ')
}

export type IntakeIdentity = {
  fullName: string
  email: string | null
  phone: string | null
}

export function normalizeIntakeIdentity(input: {
  fullName: string | null | undefined
  email: string | null | undefined
  phone: string | null | undefined
}): IntakeIdentity {
  return {
    fullName: normalizeName(input.fullName),
    email: normalizeEmail(input.email),
    phone: normalizePhone(input.phone),
  }
}

export function buildDedupeKey(
  workspaceId: string,
  identity: { email: string | null | undefined; phone: string | null | undefined },
): string | null {
  const email = normalizeEmail(identity.email)
  if (email) return `email:${workspaceId}:${email}`
  const phone = normalizePhone(identity.phone)
  if (phone) return `phone:${workspaceId}:${phone}`
  return null
}
