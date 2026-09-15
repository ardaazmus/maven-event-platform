import assert from 'node:assert/strict'
import { evaluateSupportBreakGlassExercise } from '../src/lib/support-break-glass-exercise.ts'

const base = {
  tenantId: 'tenant-001',
  requestedTenantId: 'tenant-001',
  policyAllowed: true,
  accessState: 'requested',
  incidentMode: 'normal',
  ticketReference: 'SUP-001',
  purpose: 'Form teslimatı tanısı',
  mfaVerified: true,
  stepUpVerified: true,
  readOnly: true,
  mutationRequested: false,
  approved: true,
  revokeRequested: false,
  nowMs: 1_000,
  expiresAtMs: 20_000,
}

assert.deepEqual(evaluateSupportBreakGlassExercise(base), {
  ok: true,
  decision: { action: 'issue', state: 'active', scope: 'tenant', mode: 'read_only', terminal: false, auditRequired: true },
})
assert.deepEqual(evaluateSupportBreakGlassExercise({ ...base, accessState: 'active' }), {
  ok: true,
  decision: { action: 'allow', state: 'active', scope: 'tenant', mode: 'read_only', terminal: false, auditRequired: true },
})
assert.deepEqual(evaluateSupportBreakGlassExercise({ ...base, accessState: 'active', revokeRequested: true }), {
  ok: true,
  decision: { action: 'revoke', state: 'revoked', scope: 'tenant', mode: 'read_only', terminal: true, auditRequired: true },
})
assert.deepEqual(evaluateSupportBreakGlassExercise({ ...base, accessState: 'active', incidentMode: 'suspected_breach' }), {
  ok: true,
  decision: { action: 'revoke', state: 'revoked', scope: 'tenant', mode: 'read_only', terminal: true, auditRequired: true },
})
assert.deepEqual(evaluateSupportBreakGlassExercise({ ...base, accessState: 'active', expiresAtMs: 1_000 }), {
  ok: true,
  decision: { action: 'expire', state: 'expired', scope: 'tenant', mode: 'read_only', terminal: true, auditRequired: true },
})

assert.deepEqual(evaluateSupportBreakGlassExercise({ ...base, requestedTenantId: 'tenant-002' }), { ok: false, reason: 'tenant_scope_mismatch' })
assert.deepEqual(evaluateSupportBreakGlassExercise({ ...base, policyAllowed: false }), { ok: false, reason: 'policy_denied' })
assert.deepEqual(evaluateSupportBreakGlassExercise({ ...base, ticketReference: null }), { ok: false, reason: 'ticket_required' })
assert.deepEqual(evaluateSupportBreakGlassExercise({ ...base, purpose: null }), { ok: false, reason: 'purpose_required' })
assert.deepEqual(evaluateSupportBreakGlassExercise({ ...base, mfaVerified: false }), { ok: false, reason: 'mfa_required' })
assert.deepEqual(evaluateSupportBreakGlassExercise({ ...base, stepUpVerified: false }), { ok: false, reason: 'step_up_required' })
assert.deepEqual(evaluateSupportBreakGlassExercise({ ...base, readOnly: false }), { ok: false, reason: 'read_only_required' })
assert.deepEqual(evaluateSupportBreakGlassExercise({ ...base, mutationRequested: true }), { ok: false, reason: 'mutation_not_allowed' })
assert.deepEqual(evaluateSupportBreakGlassExercise({ ...base, accessState: 'revoked' }), { ok: false, reason: 'already_revoked' })
assert.deepEqual(evaluateSupportBreakGlassExercise({ ...base, accessState: 'expired' }), { ok: false, reason: 'already_expired' })
assert.deepEqual(evaluateSupportBreakGlassExercise({ ...base, expiresAtMs: 61 * 60 * 1000 }), { ok: false, reason: 'ttl_invalid' })

const safeDecision = JSON.stringify(evaluateSupportBreakGlassExercise(base))
assert(!safeDecision.includes('SUP-001') && !safeDecision.includes('Form teslimatı'), 'decision must not expose ticket or purpose')
assert(!safeDecision.includes('tenant-001'), 'decision must not expose tenant identifier')

console.log('support-break-glass-exercise.test: PASS (R10-V4-39)')
