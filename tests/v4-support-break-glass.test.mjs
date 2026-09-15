import assert from 'node:assert/strict'
import { evaluateSupportAccess } from '../src/lib/support-access-policy.ts'

const base = {
  tenantId: 'tenant-a',
  requestedTenantId: 'tenant-a',
  tenantStatus: 'active',
  moduleEnabled: true,
  operatorRole: 'platform_support',
  supportIdentityId: 'support-identity',
  mode: 'read_only',
  resources: ['form_metadata', 'submission_status'],
  tenantApproval: {
    granted: true,
    approvalId: 'approval-1',
    approvedByUserId: 'tenant-owner',
    expiresAt: '2026-09-10T10:30:00.000Z',
    revokedAt: null,
  },
  mfaVerified: true,
  stepUpVerified: true,
  reason: 'Tanı için sınırlı erişim',
  ticketReference: 'SUP-100',
  now: '2026-09-10T10:00:00.000Z',
  expiresAt: '2026-09-10T10:20:00.000Z',
}

assert.deepEqual(evaluateSupportAccess(base), {
  allowed: true,
  scope: 'tenant',
  mode: 'read_only',
  resources: ['form_metadata', 'submission_status'],
  expiresAt: '2026-09-10T10:20:00.000Z',
})
assert.deepEqual(evaluateSupportAccess({ ...base, operatorRole: 'owner' }), { allowed: false, reason: 'operator_not_support' })
assert.deepEqual(evaluateSupportAccess({ ...base, requestedTenantId: 'tenant-b' }), { allowed: false, reason: 'tenant_scope_mismatch' })
assert.deepEqual(evaluateSupportAccess({ ...base, tenantApproval: { ...base.tenantApproval, revokedAt: '2026-09-10T09:59:00.000Z' } }), { allowed: false, reason: 'approval_revoked' })
assert.deepEqual(evaluateSupportAccess({ ...base, mfaVerified: false }), { allowed: false, reason: 'mfa_required' })
assert.deepEqual(evaluateSupportAccess({ ...base, resources: ['provider_secret'] }), { allowed: false, reason: 'resource_not_allowed' })
assert.deepEqual(evaluateSupportAccess({ ...base, mode: 'read_write' }), { allowed: false, reason: 'read_only_required' })
assert.deepEqual(evaluateSupportAccess({ ...base, expiresAt: '2026-09-10T12:00:00.000Z' }), { allowed: false, reason: 'expiry_invalid' })
assert.deepEqual(evaluateSupportAccess({ ...base, tenantStatus: 'suspended' }), { allowed: false, reason: 'tenant_not_active' })
assert.deepEqual(evaluateSupportAccess({ ...base, tenantApproval: { ...base.tenantApproval, expiresAt: '2026-09-10T09:59:00.000Z' } }), { allowed: false, reason: 'approval_expired' })
assert.deepEqual(evaluateSupportAccess({ ...base, stepUpVerified: false }), { allowed: false, reason: 'step_up_required' })

const safeDecision = JSON.stringify(evaluateSupportAccess(base))
assert(!safeDecision.includes('tenant-owner') && !safeDecision.includes('SUP-100'), 'decision must not expose approval or ticket metadata')
assert(!safeDecision.includes('secret') && !safeDecision.includes('PII'), 'decision must not expose protected data')

console.log('v4-support-break-glass.test: PASS')
