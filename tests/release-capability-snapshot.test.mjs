import assert from 'node:assert/strict'
import {
  CAPABILITY_STATUSES,
  normalizeCapabilitySnapshot,
  V1_MODULE_DECISIONS,
} from '../src/lib/release-module.ts'

const decision = V1_MODULE_DECISIONS.find(item => item.module === 'online_payments')

for (const capabilityStatus of CAPABILITY_STATUSES) {
  const snapshot = normalizeCapabilitySnapshot({
    module: decision.module,
    enabled: decision.enabled,
    entitlementReason: decision.reason,
    scope: decision.scope,
    capabilityStatus,
    capabilityReason: `evidence-${capabilityStatus}`,
  })

  assert.deepEqual(snapshot, {
    module: 'online_payments',
    enabled: false,
    entitlementReason: 'version_entitlement',
    scope: 'form',
    capabilityStatus,
    capabilityReason: `evidence-${capabilityStatus}`,
  })
  assert.equal(Object.isFrozen(snapshot), true)
}

assert.equal(normalizeCapabilitySnapshot({
  module: 'online_payments',
  enabled: false,
  entitlementReason: 'version_entitlement',
  scope: 'form',
  capabilityStatus: 'not-verified',
  capabilityReason: 'invalid status',
}), null)

assert.equal(normalizeCapabilitySnapshot({
  module: 'online_payments',
  enabled: false,
  entitlementReason: 'version_entitlement',
  scope: 'form',
  capabilityStatus: 'unknown',
  capabilityReason: '   ',
}), null)

assert.equal(normalizeCapabilitySnapshot({
  module: 'unlisted_module',
  enabled: false,
  entitlementReason: 'version_entitlement',
  scope: 'form',
  capabilityStatus: 'blocked',
  capabilityReason: 'R-10 evidence missing',
}), null)

console.log('release-capability-snapshot.test: PASS (R10-V4-03)')
