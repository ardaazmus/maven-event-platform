import assert from 'node:assert/strict'
import { evaluateFirstPartyPaymentScope } from '../src/lib/r10-scope-gate.ts'

const ready = {
  scope: 'first_party',
  environment: 'staging',
  workspaceId: 'workspace_maven',
  merchantWorkspaceId: 'workspace_maven',
}

assert.deepEqual(evaluateFirstPartyPaymentScope(ready), {
  ok: true,
  scope: 'first_party',
  environment: 'staging',
})
assert.deepEqual(evaluateFirstPartyPaymentScope({ ...ready, environment: 'production' }), {
  ok: false,
  reason: 'production_requires_global_r10_evidence',
})
assert.deepEqual(evaluateFirstPartyPaymentScope({ ...ready, scope: 'saas' }), {
  ok: false,
  reason: 'saas_scope_deferred',
})
assert.deepEqual(evaluateFirstPartyPaymentScope({ ...ready, merchantWorkspaceId: 'workspace_other' }), {
  ok: false,
  reason: 'merchant_workspace_mismatch',
})
assert.deepEqual(evaluateFirstPartyPaymentScope({ ...ready, clientRequestedScope: 'first_party' }), {
  ok: false,
  reason: 'client_scope_not_authoritative',
})
assert.deepEqual(evaluateFirstPartyPaymentScope({ ...ready, workspaceId: '' }), {
  ok: false,
  reason: 'workspace_identity_required',
})

console.log('v2-first-party-payment-gate.test: PASS')
