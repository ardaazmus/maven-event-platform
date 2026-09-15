import assert from 'node:assert/strict'
import { TENANT_BOUNDARY_OPERATIONS, evaluateTenantBoundary } from '../src/lib/tenant-boundary-negative-matrix.ts'

assert.deepEqual(TENANT_BOUNDARY_OPERATIONS, ['upload', 'connection', 'document', 'export'])
for (const operation of TENANT_BOUNDARY_OPERATIONS) {
  assert.deepEqual(evaluateTenantBoundary({ operation, actorWorkspaceId: 'ws-a', resourceWorkspaceId: 'ws-b', resourceExists: true, actorCanAccess: true }), { allowed: false, status: 403, reason: 'workspace_mismatch' })
}
assert.deepEqual(evaluateTenantBoundary({ operation: 'document', actorWorkspaceId: 'ws-a', resourceWorkspaceId: 'ws-a', resourceExists: false, actorCanAccess: true }), { allowed: false, status: 404, reason: 'resource_not_found' })
assert.deepEqual(evaluateTenantBoundary({ operation: 'export', actorWorkspaceId: 'ws-a', resourceWorkspaceId: 'ws-a', resourceExists: true, actorCanAccess: true, resourceFormId: 'form-a', requestedFormId: 'form-b' }), { allowed: false, status: 403, reason: 'form_scope_mismatch' })
assert.deepEqual(evaluateTenantBoundary({ operation: 'upload', actorWorkspaceId: 'ws-a', resourceWorkspaceId: 'ws-a', resourceExists: true, actorCanAccess: true, clientTenantId: 'ws-a' }), { allowed: false, status: 403, reason: 'client_scope_not_authoritative' })
assert.deepEqual(evaluateTenantBoundary({ operation: 'connection', actorWorkspaceId: 'ws-a', resourceWorkspaceId: 'ws-a', resourceExists: true, actorCanAccess: true }), { allowed: true, status: 200, operation: 'connection' })

console.log('tenant-boundary-negative-matrix.test: PASS (R10-V4-32)')
