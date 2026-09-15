import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'

export const DANGEROUS_ACTIONS = ['archive_workspace', 'delete_workspace'] as const
export type DangerousAction = (typeof DANGEROUS_ACTIONS)[number]
export const DANGEROUS_CODE_TTL_MS = 10 * 60 * 1000
export const DANGEROUS_CODE_MAX_ATTEMPTS = 5

export function isDangerousAction(value: unknown): value is DangerousAction {
  return typeof value === 'string' && (DANGEROUS_ACTIONS as readonly string[]).includes(value)
}

export function isAccountAdmin(role: unknown): boolean {
  return role === 'owner'
}

export function generateDangerousActionCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0')
}

export function hashDangerousActionCode(challengeId: string, code: string, pepper = process.env.MAVENFORMS_DANGEROUS_ACTION_PEPPER): string {
  if (!pepper) throw new Error('MAVENFORMS_DANGEROUS_ACTION_PEPPER is required')
  return createHmac('sha256', pepper).update(`${challengeId}:${code}`, 'utf8').digest('hex')
}

export function verifyDangerousActionCode(challengeId: string, code: string, expectedHash: string, pepper = process.env.MAVENFORMS_DANGEROUS_ACTION_PEPPER): boolean {
  if (!/^\d{6}$/.test(code)) return false
  let actual: Buffer
  let expected: Buffer
  try {
    actual = Buffer.from(hashDangerousActionCode(challengeId, code, pepper), 'hex')
    expected = Buffer.from(expectedHash, 'hex')
  } catch {
    return false
  }
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return 'gizli e-posta'
  return `${local.slice(0, 1)}${'*'.repeat(Math.max(1, Math.min(local.length - 1, 4)))}@${domain}`
}

export function confirmationPhrase(action: DangerousAction): string {
  return action === 'delete_workspace' ? 'SİL' : 'ARŞİVLE'
}
