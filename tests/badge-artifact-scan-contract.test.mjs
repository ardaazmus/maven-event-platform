import assert from 'node:assert/strict'
import { advanceBadgeArtifactScan } from '../src/lib/badge-artifact-scan-contract.ts'

assert.deepEqual(advanceBadgeArtifactScan({ currentState: 'QUARANTINED', event: 'SCAN_PASSED' }), {
  ok: true,
  decision: { state: 'READY', downloadable: true },
})
assert.deepEqual(advanceBadgeArtifactScan({ currentState: 'QUARANTINED', event: 'SCAN_FAILED' }), {
  ok: true,
  decision: { state: 'BLOCKED', downloadable: false },
})
assert.deepEqual(advanceBadgeArtifactScan({ currentState: 'READY', event: 'SCAN_FAILED' }), { ok: false, code: 'TRANSITION_INVALID' })
assert.deepEqual(advanceBadgeArtifactScan({ currentState: 'BLOCKED', event: 'SCAN_PASSED' }), { ok: false, code: 'TRANSITION_INVALID' })
assert.deepEqual(advanceBadgeArtifactScan({ currentState: 'QUARANTINED', event: 'UNTRUSTED' }), { ok: false, code: 'EVENT_INVALID' })

console.log('badge-artifact-scan-contract: all assertions passed')
