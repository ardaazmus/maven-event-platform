import assert from 'node:assert/strict'
import {
  R10_EVIDENCE_CLASSES,
  R10_RUNTIME_EVIDENCE_STATUSES,
  normalizeR10EvidenceRecord,
} from '../src/lib/r10-scope-gate.ts'

assert.deepEqual(R10_EVIDENCE_CLASSES, ['E0', 'E1', 'E2', 'E3', 'E4', 'E5', 'E6'])
assert.deepEqual(R10_RUNTIME_EVIDENCE_STATUSES, ['LOCAL_PASS', 'PILOT_PASS', 'RELEASE_PASS'])
assert.deepEqual(normalizeR10EvidenceRecord({ evidenceClass: 'E4', runtimeEvidenceStatus: 'PILOT_PASS' }), {
  evidenceClass: 'E4',
  runtimeEvidenceStatus: 'PILOT_PASS',
})
assert.deepEqual(normalizeR10EvidenceRecord({ evidenceClass: 'E6', runtimeEvidenceStatus: 'RELEASE_PASS' }), {
  evidenceClass: 'E6',
  runtimeEvidenceStatus: 'RELEASE_PASS',
})
for (const value of [null, {}, [], { evidenceClass: 'E7', runtimeEvidenceStatus: 'LOCAL_PASS' }, { evidenceClass: 'E1', runtimeEvidenceStatus: 'PRODUCTION_READY' }]) {
  assert.equal(normalizeR10EvidenceRecord(value), null)
}

console.log('r10-evidence-model.test: PASS (R10-V4-01)')
