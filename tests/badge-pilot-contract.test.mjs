import assert from 'node:assert/strict'
import { advanceBadgePilotProof, createBadgePilotProofPlan } from '../src/lib/badge-pilot-contract.ts'

function advance(plan, event) {
  const result = advanceBadgePilotProof({ plan, event })
  assert.equal(result.ok, true)
  return result.plan
}

const single = createBadgePilotProofPlan({
  pilotId: 'pilot-single',
  workspaceId: 'workspace-1',
  formId: 'form-1',
  templateVersionId: 'template-v1',
  faceMode: 'SINGLE_FACE',
})
assert.equal(single.ok, true)
assert.deepEqual(single.plan.requiredFaces, ['front'])
assert.equal(single.plan.environment, 'INTERNAL_PILOT_ONLY')
assert.deepEqual(advanceBadgePilotProof({ plan: single.plan, event: 'ACCEPT' }), { ok: false, code: 'EVENT_ORDER_INVALID' })

let singlePlan = advance(single.plan, 'PREVIEWED')
singlePlan = advance(singlePlan, 'PRINTED_FRONT')
assert.deepEqual(advanceBadgePilotProof({ plan: singlePlan, event: 'ACCEPT' }), { ok: false, code: 'QR_SCAN_REQUIRED' })
singlePlan = advance(singlePlan, 'QR_SCANNED')
singlePlan = advance(singlePlan, 'ACCEPT')
assert.equal(singlePlan.status, 'ACCEPTED')

const dual = createBadgePilotProofPlan({
  pilotId: 'pilot-dual',
  workspaceId: 'workspace-1',
  formId: 'form-1',
  templateVersionId: 'template-v1',
  faceMode: 'DUAL_FACE',
})
assert.equal(dual.ok, true)
assert.deepEqual(dual.plan.requiredFaces, ['front', 'back'])
let dualPlan = advance(dual.plan, 'PREVIEWED')
dualPlan = advance(dualPlan, 'PRINTED_FRONT')
assert.deepEqual(advanceBadgePilotProof({ plan: dualPlan, event: 'QR_SCANNED' }), { ok: false, code: 'REQUIRED_FACE_MISSING' })
assert.deepEqual(advanceBadgePilotProof({ plan: dualPlan, event: 'ACCEPT' }), { ok: false, code: 'REQUIRED_FACE_MISSING' })
dualPlan = advance(dualPlan, 'PRINTED_BACK')
dualPlan = advance(dualPlan, 'QR_SCANNED')
dualPlan = advance(dualPlan, 'ACCEPT')
assert.equal(dualPlan.status, 'ACCEPTED')

assert.deepEqual(createBadgePilotProofPlan({
  pilotId: 'pilot/unsafe',
  workspaceId: 'workspace-1',
  formId: 'form-1',
  templateVersionId: 'template-v1',
  faceMode: 'SINGLE_FACE',
}), { ok: false, code: 'IDENTIFIER_INVALID' })
assert.deepEqual(createBadgePilotProofPlan({
  pilotId: 'pilot-invalid',
  workspaceId: 'workspace-1',
  formId: 'form-1',
  templateVersionId: 'template-v1',
  faceMode: 'UNKNOWN',
}), { ok: false, code: 'FACE_MODE_INVALID' })

console.log('badge-pilot-contract: all assertions passed')
