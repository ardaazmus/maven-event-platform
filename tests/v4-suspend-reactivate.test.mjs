import assert from 'node:assert/strict'
import { evaluateTenantSuspensionAction } from '../src/lib/tenant-suspension-policy.ts'

const active = {
  tenantId: 'tenant-a',
  requestedTenantId: 'tenant-a',
  tenantStatus: 'active',
  publishedSnapshotAvailable: true,
  actorRole: 'owner',
}

assert.deepEqual(evaluateTenantSuspensionAction({ ...active, action: 'public_read' }), { allowed: true, scope: 'tenant', action: 'public_read', status: 'active', dataPreserved: true, publicForm: 'published' })
assert.deepEqual(evaluateTenantSuspensionAction({ ...active, action: 'suspend', actorRole: 'platform_operator' }), { allowed: true, scope: 'tenant', action: 'suspend', status: 'suspended', dataPreserved: true, publicForm: 'deactivated' })
assert.deepEqual(evaluateTenantSuspensionAction({ ...active, action: 'create_form' }), { allowed: true, scope: 'tenant', action: 'create_form', status: 'active', dataPreserved: true, publicForm: 'not_applicable' })
assert.deepEqual(evaluateTenantSuspensionAction({ ...active, action: 'export_submissions', exportPermission: true, actorRole: 'viewer', tenantStatus: 'suspended' }), { allowed: true, scope: 'tenant', action: 'export_submissions', status: 'suspended', dataPreserved: true, publicForm: 'not_applicable' })

const suspended = { ...active, tenantStatus: 'suspended' }
assert.deepEqual(evaluateTenantSuspensionAction({ ...suspended, action: 'public_read' }), { allowed: false, reason: 'tenant_suspended' })
assert.deepEqual(evaluateTenantSuspensionAction({ ...suspended, action: 'publish_form' }), { allowed: false, reason: 'tenant_suspended' })
assert.deepEqual(evaluateTenantSuspensionAction({ ...suspended, action: 'delete_form' }), { allowed: false, reason: 'tenant_suspended' })
assert.deepEqual(evaluateTenantSuspensionAction({ ...suspended, action: 'export_submissions', exportPermission: false, actorRole: 'owner' }), { allowed: false, reason: 'export_permission_required' })
assert.deepEqual(evaluateTenantSuspensionAction({ ...suspended, action: 'subscription_read', actorRole: 'viewer' }), { allowed: false, reason: 'role_not_allowed' })
assert.deepEqual(evaluateTenantSuspensionAction({ ...suspended, action: 'reactivate', actorRole: 'admin', dataPreserved: true, idempotencyStatePreserved: true }), { allowed: false, reason: 'subscription_operator_required' })
assert.deepEqual(evaluateTenantSuspensionAction({ ...suspended, action: 'reactivate', actorRole: 'platform_operator', dataPreserved: false, idempotencyStatePreserved: true }), { allowed: false, reason: 'reactivation_state_not_preserved' })
assert.deepEqual(evaluateTenantSuspensionAction({ ...suspended, action: 'reactivate', actorRole: 'platform_operator', dataPreserved: true, idempotencyStatePreserved: true }), { allowed: true, scope: 'tenant', action: 'reactivate', status: 'active', dataPreserved: true, publicForm: 'published' })
assert.deepEqual(evaluateTenantSuspensionAction({ ...suspended, requestedTenantId: 'tenant-b', action: 'export_submissions', exportPermission: true, actorRole: 'owner' }), { allowed: false, reason: 'tenant_scope_mismatch' })

const safeDecision = JSON.stringify(evaluateTenantSuspensionAction({ ...suspended, action: 'reactivate', actorRole: 'platform_operator', dataPreserved: true, idempotencyStatePreserved: true }))
assert(!safeDecision.includes('payment') && !safeDecision.includes('secret') && !safeDecision.includes('PII'), 'decision must not expose protected data')

console.log('v4-suspend-reactivate.test: PASS')
