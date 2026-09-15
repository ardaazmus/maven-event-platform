import assert from 'node:assert/strict'
import {
  canTransitionConnectionVerification,
  normalizeConnectionVerification,
  transitionConnectionVerification,
} from '../src/lib/connection-verification-contract.ts'

const draft = {
  evidenceId: 'evidence-1',
  connectionId: 'connection-1',
  tenantId: 'tenant-1',
  workspaceId: 'workspace-1',
  purpose: 'payment',
  environment: 'test',
  state: 'draft',
  checkedAtMs: null,
  capabilityStatus: 'unknown',
  evidenceClass: 'local',
}

assert.deepEqual(normalizeConnectionVerification(draft, 'connection-1', 'workspace-1'), { ok: true, evidence: draft })
assert.equal(canTransitionConnectionVerification('draft', 'verifying'), true)
assert.equal(canTransitionConnectionVerification('draft', 'enabled'), false)

const verifying = transitionConnectionVerification(draft, { to: 'verifying', nowMs: 10_000 }, 'connection-1', 'workspace-1')
assert.deepEqual(verifying, { ok: true, evidence: { ...draft, state: 'verifying', checkedAtMs: 10_000 } })

if (verifying.ok) {
  const verified = transitionConnectionVerification(
    verifying.evidence,
    { to: 'verified', nowMs: 20_000, capabilityStatus: 'verified', evidenceClass: 'sandbox' },
    'connection-1',
    'workspace-1',
  )
  assert.deepEqual(verified, { ok: true, evidence: { ...draft, state: 'verified', checkedAtMs: 20_000, capabilityStatus: 'verified', evidenceClass: 'sandbox' } })
  if (verified.ok) {
    assert.deepEqual(
      transitionConnectionVerification(verified.evidence, { to: 'enabled', nowMs: 30_000 }, 'connection-1', 'workspace-1'),
      { ok: true, evidence: { ...draft, state: 'enabled', checkedAtMs: 30_000, capabilityStatus: 'verified', evidenceClass: 'sandbox' } },
    )
    assert.deepEqual(
      transitionConnectionVerification({ ...verified.evidence, environment: 'live' }, { to: 'enabled', nowMs: 30_000 }, 'connection-1', 'workspace-1'),
      { ok: false, reason: 'live_external_evidence_required' },
    )
  }
}

assert.deepEqual(normalizeConnectionVerification({ ...draft, rawResponse: { provider: 'secret' } }), { ok: false, reason: 'secret_forbidden' })
assert.deepEqual(normalizeConnectionVerification({ ...draft, unexpected: true }), { ok: false, reason: 'input_invalid' })
assert.deepEqual(normalizeConnectionVerification({ ...draft, checkedAtMs: 1 }), { ok: false, reason: 'checked_at_forbidden' })
assert.deepEqual(normalizeConnectionVerification({ ...draft, state: 'verified' }), { ok: false, reason: 'checked_at_required' })
assert.deepEqual(normalizeConnectionVerification({ ...draft, state: 'enabled', capabilityStatus: 'unknown', checkedAtMs: 1 }), { ok: false, reason: 'capability_unverified' })
assert.deepEqual(normalizeConnectionVerification(draft, 'connection-2'), { ok: false, reason: 'connection_mismatch' })
assert.deepEqual(transitionConnectionVerification(draft, { to: 'enabled', nowMs: 1 }), { ok: false, reason: 'transition_invalid' })

console.log('connection-verification-contract.test: PASS (R10-V4-13)')
