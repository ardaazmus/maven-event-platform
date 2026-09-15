export type BadgeCapabilityTarget = 'INTERNAL_PILOT' | 'PRODUCTION'

export type BadgePhaseStatus = 'LOCAL_PASS' | 'PARKED' | 'BLOCKED' | 'NOT_RUN'

export type BadgeReleaseDecision = 'INTERNAL_PILOT_READY' | 'BLOCKED'

export type BadgeReleaseResult = Readonly<{
  decision: BadgeReleaseDecision
  target: BadgeCapabilityTarget
  missingPhases: readonly string[]
  r10Required: boolean
  providerEnablement: 'DISABLED'
  productionEnabled: false
}> 

const REQUIRED_BADGE_PHASES = ['BADGE-00-R1', ...Array.from({ length: 17 }, (_, index) => `BADGE-${String(index + 1).padStart(2, '0')}`)] as const

function hasLocalPass(phaseStatuses: Readonly<Record<string, BadgePhaseStatus>>, phaseId: string) {
  return phaseStatuses[phaseId] === 'LOCAL_PASS'
}

export function evaluateBadgeReleaseGate(input: Readonly<{
  target: BadgeCapabilityTarget
  phaseStatuses: Readonly<Record<string, BadgePhaseStatus>>
  r10Status: 'NO-GO/BLOCKED' | 'PASS'
}>): BadgeReleaseResult {
  const missingPhases = REQUIRED_BADGE_PHASES.filter((phaseId) => !hasLocalPass(input.phaseStatuses, phaseId))
  const productionTarget = input.target === 'PRODUCTION'
  const blocked = missingPhases.length > 0 || (productionTarget && input.r10Status !== 'PASS')

  return {
    decision: blocked ? 'BLOCKED' : 'INTERNAL_PILOT_READY',
    target: input.target,
    missingPhases,
    r10Required: productionTarget,
    providerEnablement: 'DISABLED',
    productionEnabled: false,
  }
}

export { REQUIRED_BADGE_PHASES }
