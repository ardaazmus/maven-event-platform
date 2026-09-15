import assert from 'node:assert/strict'
import {
  evaluateExternalEvidenceFreshness,
  normalizeExternalEvidence,
} from '../src/lib/external-evidence-intake.ts'

const base = {
  evidenceId: 'evidence-001',
  ownerId: 'owner-001',
  systemId: 'iyzico-sandbox',
  environment: 'sandbox',
  scope: 'payment',
  evidenceClass: 'E2',
  status: 'verified',
  expiresAtMs: 2000,
  lastVerifiedAtMs: 1000,
  inputReference: 'input-001',
  artifactSha256: 'a'.repeat(64),
  decision: 'PASS',
}

const normalized = normalizeExternalEvidence(base)
assert.equal(normalized.ok, true)
assert.deepEqual(normalized.record, base)
assert.equal(Object.isFrozen(normalized.record), true)

assert.deepEqual(evaluateExternalEvidenceFreshness({ record: normalized.record, nowMs: 1500 }), {
  ok: true,
  freshness: 'usable',
  evidenceId: 'evidence-001',
  scope: 'payment',
  evidenceClass: 'E2',
  expiresAtMs: 2000,
  decision: 'PASS',
})

for (const extraKey of ['secret', 'notes', 'rawPayload', 'pan', 'cvv']) {
  const result = normalizeExternalEvidence({ ...base, [extraKey]: 'must-not-enter' })
  assert.deepEqual(result, { ok: false, reason: 'sensitive_metadata_not_allowed' })
}

assert.deepEqual(normalizeExternalEvidence({ ...base, environment: 'local' }), { ok: false, reason: 'input_invalid' })
assert.deepEqual(normalizeExternalEvidence({ ...base, status: 'unknown' }), { ok: true, record: { ...base, status: 'unknown' } })
assert.deepEqual(normalizeExternalEvidence({ ...base, decision: 'EXTERNAL_DEPENDENCY' }), { ok: true, record: { ...base, decision: 'EXTERNAL_DEPENDENCY' } })
assert.deepEqual(normalizeExternalEvidence({ ...base, expiresAtMs: 1000 }), { ok: false, reason: 'input_invalid' })

assert.deepEqual(evaluateExternalEvidenceFreshness({ record: { ...base, status: 'unknown' }, nowMs: 1500 }), { ok: false, reason: 'not_verified' })
assert.deepEqual(evaluateExternalEvidenceFreshness({ record: { ...base, decision: 'EXTERNAL_DEPENDENCY' }, nowMs: 1500 }), { ok: false, reason: 'decision_not_pass' })
assert.deepEqual(evaluateExternalEvidenceFreshness({ record: { ...base, artifactSha256: null }, nowMs: 1500 }), { ok: false, reason: 'artifact_hash_required' })
assert.deepEqual(evaluateExternalEvidenceFreshness({ record: { ...base, expiresAtMs: null }, nowMs: 1500 }), { ok: false, reason: 'expiry_missing' })
assert.deepEqual(evaluateExternalEvidenceFreshness({ record: base, nowMs: 2000 }), { ok: false, reason: 'evidence_expired' })
assert.deepEqual(evaluateExternalEvidenceFreshness({ record: base, nowMs: 900 }), { ok: false, reason: 'input_invalid' })
assert.deepEqual(evaluateExternalEvidenceFreshness({ record: base, nowMs: 1500, secret: 'nope' }), { ok: false, reason: 'input_invalid' })

const freshness = evaluateExternalEvidenceFreshness({ record: normalized.record, nowMs: 1500 })
assert.equal(JSON.stringify(freshness).includes('owner-001'), false)
assert.equal(JSON.stringify(freshness).includes('iyzico-sandbox'), false)
assert.equal(JSON.stringify(freshness).includes('input-001'), false)

console.log('external-evidence-intake.test: PASS (R10-V4-42)')
