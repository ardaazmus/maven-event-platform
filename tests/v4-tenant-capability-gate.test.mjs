import assert from 'node:assert/strict'
import { evaluateV4TenantCapability } from '../src/lib/v4-tenant-capability-gate.ts'

const base = {
  tenantId: 'tenant-001',
  requestedTenantId: 'tenant-001',
  workspaceId: 'workspace-001',
  tenantWorkspaceId: 'workspace-001',
  connectionWorkspaceId: 'workspace-001',
  capability: 'payment',
  tenantStatus: 'active',
  entitlementEnabled: true,
  capabilityStatus: 'verified',
  mode: 'test',
  productionR10Evidence: false,
}

assert.deepEqual(evaluateV4TenantCapability(base), { ok: true, capability: 'payment', scope: 'tenant', mode: 'test', productionMutationAllowed: false })
assert.deepEqual(evaluateV4TenantCapability({ ...base, mode: 'live' }), { ok: false, reason: 'live_gate_closed' })
assert.deepEqual(evaluateV4TenantCapability({ ...base, mode: 'live', productionR10Evidence: true }), { ok: true, capability: 'payment', scope: 'tenant', mode: 'live', productionMutationAllowed: true })
assert.deepEqual(evaluateV4TenantCapability({ ...base, requestedTenantId: 'tenant-002' }), { ok: false, reason: 'tenant_scope_mismatch' })
assert.deepEqual(evaluateV4TenantCapability({ ...base, connectionWorkspaceId: 'workspace-002' }), { ok: false, reason: 'workspace_mismatch' })
assert.deepEqual(evaluateV4TenantCapability({ ...base, tenantStatus: 'suspended' }), { ok: false, reason: 'tenant_not_active' })
assert.deepEqual(evaluateV4TenantCapability({ ...base, entitlementEnabled: false }), { ok: false, reason: 'entitlement_required' })
assert.deepEqual(evaluateV4TenantCapability({ ...base, capabilityStatus: 'unknown' }), { ok: false, reason: 'capability_not_verified' })
assert.deepEqual(evaluateV4TenantCapability({ ...base, capabilityStatus: 'blocked' }), { ok: false, reason: 'capability_not_verified' })
assert.deepEqual(evaluateV4TenantCapability({ ...base, capability: 'parasut' }), { ok: false, reason: 'capability_deferred' })
assert.deepEqual(evaluateV4TenantCapability({ ...base, token: 'must-not-enter' }), { ok: false, reason: 'sensitive_metadata_not_allowed' })
assert.deepEqual(evaluateV4TenantCapability({ ...base, mode: 'invalid' }), { ok: false, reason: 'input_invalid' })

const safeDecision = JSON.stringify(evaluateV4TenantCapability(base))
assert(!safeDecision.includes('must-not-enter') && !safeDecision.includes('workspace-001'), 'decision must not expose connection identifiers or credentials')

console.log('v4-tenant-capability-gate.test: PASS (R10-V4-41)')
