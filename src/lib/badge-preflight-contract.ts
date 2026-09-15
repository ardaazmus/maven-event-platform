export type BadgePreflightCheckOutcome = 'PASS' | 'WARN' | 'BLOCKED'
export type BadgePreflightStatus = 'PASS' | 'WARN_REQUIRES_CONFIRMATION' | 'BLOCKED' | 'PRINT_PROOF_REQUIRED'

export type BadgePreflightCheck = Readonly<{
  code: string
  outcome: BadgePreflightCheckOutcome
}>

export type BadgePreflightReport = Readonly<{
  status: BadgePreflightStatus
  proofSheetRequired: boolean
  checks: ReadonlyArray<BadgePreflightCheck>
  blockedCount: number
  warningCount: number
}>

export type BadgePreflightValidationCode =
  | 'OK'
  | 'CHECKS_REQUIRED'
  | 'CHECK_CODE_INVALID'
  | 'CHECK_OUTCOME_INVALID'

function isSafeCode(value: string) {
  return /^[A-Z0-9_:-]{1,64}$/u.test(value)
}

export function buildBadgePreflightReport(input: Readonly<{
  checks: ReadonlyArray<BadgePreflightCheck>
  proofProvided: boolean
  warningsConfirmed?: boolean
}>): { ok: true; report: BadgePreflightReport } | { ok: false; code: BadgePreflightValidationCode } {
  if (!input.checks.length) return { ok: false, code: 'CHECKS_REQUIRED' }
  const seen = new Set<string>()
  let blockedCount = 0
  let warningCount = 0
  const checks: BadgePreflightCheck[] = []

  for (const check of input.checks) {
    if (!isSafeCode(check.code) || seen.has(check.code)) return { ok: false, code: 'CHECK_CODE_INVALID' }
    if (check.outcome !== 'PASS' && check.outcome !== 'WARN' && check.outcome !== 'BLOCKED') return { ok: false, code: 'CHECK_OUTCOME_INVALID' }
    seen.add(check.code)
    if (check.outcome === 'BLOCKED') blockedCount += 1
    if (check.outcome === 'WARN') warningCount += 1
    checks.push({ code: check.code, outcome: check.outcome })
  }

  const status: BadgePreflightStatus = blockedCount > 0
    ? 'BLOCKED'
    : warningCount > 0 && !input.warningsConfirmed
      ? 'WARN_REQUIRES_CONFIRMATION'
      : !input.proofProvided
        ? 'PRINT_PROOF_REQUIRED'
        : 'PASS'

  return {
    ok: true,
    report: {
      status,
      proofSheetRequired: !input.proofProvided,
      checks,
      blockedCount,
      warningCount,
    },
  }
}
