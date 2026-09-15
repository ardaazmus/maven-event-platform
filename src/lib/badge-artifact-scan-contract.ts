export type BadgeArtifactScanState = 'QUARANTINED' | 'READY' | 'BLOCKED'
export type BadgeArtifactScanEvent = 'SCAN_PASSED' | 'SCAN_FAILED'

export type BadgeArtifactScanDecision = Readonly<{
  state: BadgeArtifactScanState
  downloadable: boolean
}>

export type BadgeArtifactScanTransitionCode = 'OK' | 'EVENT_INVALID' | 'TRANSITION_INVALID'

export function advanceBadgeArtifactScan(input: Readonly<{
  currentState: BadgeArtifactScanState
  event: BadgeArtifactScanEvent
}>): { ok: true; decision: BadgeArtifactScanDecision } | { ok: false; code: BadgeArtifactScanTransitionCode } {
  if (input.event !== 'SCAN_PASSED' && input.event !== 'SCAN_FAILED') return { ok: false, code: 'EVENT_INVALID' }
  if (input.currentState !== 'QUARANTINED') return { ok: false, code: 'TRANSITION_INVALID' }

  const state = input.event === 'SCAN_PASSED' ? 'READY' : 'BLOCKED'
  return { ok: true, decision: { state, downloadable: state === 'READY' } }
}
