import assert from 'node:assert/strict'
import { evaluateBadgeReleaseGate, REQUIRED_BADGE_PHASES } from '../src/lib/badge-release-contract.ts'

const phaseStatuses = Object.fromEntries(REQUIRED_BADGE_PHASES.map((phaseId) => [phaseId, 'LOCAL_PASS']))

const internalPilot = evaluateBadgeReleaseGate({
  target: 'INTERNAL_PILOT',
  phaseStatuses,
  r10Status: 'NO-GO/BLOCKED',
})
assert.deepEqual(internalPilot, {
  decision: 'INTERNAL_PILOT_READY',
  target: 'INTERNAL_PILOT',
  missingPhases: [],
  r10Required: false,
  providerEnablement: 'DISABLED',
  productionEnabled: false,
})

const missingPhase = evaluateBadgeReleaseGate({
  target: 'INTERNAL_PILOT',
  phaseStatuses: { ...phaseStatuses, 'BADGE-12': 'NOT_RUN' },
  r10Status: 'NO-GO/BLOCKED',
})
assert.equal(missingPhase.decision, 'BLOCKED')
assert.deepEqual(missingPhase.missingPhases, ['BADGE-12'])

const production = evaluateBadgeReleaseGate({
  target: 'PRODUCTION',
  phaseStatuses,
  r10Status: 'NO-GO/BLOCKED',
})
assert.equal(production.decision, 'BLOCKED')
assert.equal(production.r10Required, true)
assert.equal(production.productionEnabled, false)
assert.equal(production.providerEnablement, 'DISABLED')
assert.deepEqual(production.missingPhases, [])

assert.deepEqual(evaluateBadgeReleaseGate({
  target: 'PRODUCTION',
  phaseStatuses: { ...phaseStatuses, 'BADGE-17': 'NOT_RUN' },
  r10Status: 'PASS',
}).missingPhases, ['BADGE-17'])

console.log('badge-release-contract: all assertions passed')
