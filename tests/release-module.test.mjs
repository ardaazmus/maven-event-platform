import assert from 'node:assert/strict'
import { evaluateModuleAccess, V1_MODULE_DECISIONS } from '../src/lib/release-module.ts'

const baseInput = {
  workspaceId: 'workspace-1',
  formId: 'form-1',
  actor: { role: 'owner' },
  environment: 'local',
  requestedVersion: 'V1',
}

assert.deepEqual(evaluateModuleAccess(baseInput), V1_MODULE_DECISIONS)

assert.deepEqual(
  evaluateModuleAccess({
    ...baseInput,
    requestedVersion: 'V4',
    requestedModule: 'online_payments',
    requestedScope: 'tenant',
  }),
  V1_MODULE_DECISIONS,
)

const decisions = evaluateModuleAccess(baseInput)
assert.equal(decisions.find(decision => decision.module === 'online_payments').enabled, false)
assert.equal(decisions.find(decision => decision.module === 'manual_invoices').enabled, false)
assert.equal(decisions.find(decision => decision.module === 'subscription_billing').enabled, false)
assert.equal(Object.isFrozen(decisions), true)
assert.equal(decisions.every(Object.isFrozen), true)

console.log('release-module.test: PASS (V1-00)')
