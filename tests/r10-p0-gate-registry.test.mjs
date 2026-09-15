import assert from 'node:assert/strict'
import { evaluateR10P0GateRegistry, R10_P0_GATE_IDS } from '../src/lib/r10-p0-gate-registry.ts'

const allVerified = R10_P0_GATE_IDS.map(id => ({ id, status: 'verified' }))
const base = { target: 'production', gates: allVerified }

assert.deepEqual(evaluateR10P0GateRegistry(base), {
  ok: true,
  decision: { decision: 'P0_READY_FOR_REVIEW', missingGateIds: [], productionMutationAllowed: false, externalReviewRequired: true },
})
assert.deepEqual(evaluateR10P0GateRegistry({ ...base, gates: allVerified.map(gate => gate.id === 'document_scan' ? { ...gate, status: 'missing' } : gate) }), {
  ok: true,
  decision: { decision: 'NO_GO', missingGateIds: ['document_scan'], productionMutationAllowed: false, externalReviewRequired: true },
})
assert.deepEqual(evaluateR10P0GateRegistry({ ...base, gates: allVerified.map(gate => gate.id === 'provider_merchant' ? { ...gate, status: 'expired' } : gate) }).decision.missingGateIds, ['provider_merchant'])
assert.deepEqual(evaluateR10P0GateRegistry({ ...base, gates: allVerified.map(gate => gate.id === 'webhook_reconciliation' ? { ...gate, status: 'blocked' } : gate) }).decision.missingGateIds, ['webhook_reconciliation'])
assert.deepEqual(evaluateR10P0GateRegistry({ ...base, gates: allVerified.map(gate => gate.id === 'independent_review' ? { ...gate, status: 'unverified' } : gate) }).decision.missingGateIds, ['independent_review'])
assert.deepEqual(evaluateR10P0GateRegistry({ ...base, gates: allVerified.slice(0, -1) }), { ok: false, reason: 'input_invalid' })
assert.deepEqual(evaluateR10P0GateRegistry({ ...base, gates: [...allVerified.slice(0, -1), allVerified[0]] }), { ok: false, reason: 'input_invalid' })
assert.deepEqual(evaluateR10P0GateRegistry({ ...base, gates: allVerified.map(gate => gate.id === 'provider_merchant' ? { ...gate, secret: 'do-not-accept' } : gate) }), { ok: false, reason: 'sensitive_metadata_not_allowed' })
assert.deepEqual(evaluateR10P0GateRegistry({ ...base, token: 'do-not-accept' }), { ok: false, reason: 'sensitive_metadata_not_allowed' })
assert.deepEqual(evaluateR10P0GateRegistry({ ...base, target: 'staging' }), { ok: false, reason: 'input_invalid' })

const safeDecision = JSON.stringify(evaluateR10P0GateRegistry(base))
assert(!safeDecision.includes('secret') && !safeDecision.includes('token') && !safeDecision.includes('provider_payload'), 'decision must not expose sensitive metadata')

console.log('r10-p0-gate-registry.test: PASS (R10-V4-40)')
