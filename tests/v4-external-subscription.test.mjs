import assert from 'node:assert/strict'
import { evaluateTenantSubscriptionChange } from '../src/lib/subscription-state.ts'

const base = {
  tenantId: 'tenant-a',
  requestedTenantId: 'tenant-a',
  subscriptionId: 'sub-1',
  actorRole: 'platform_operator',
  subscriptionDomain: 'platform_subscription',
  providerMutation: false,
  operatorApproved: true,
  approvalReference: 'OPS-100',
  currentState: 'due_soon',
  targetState: 'active',
  effectiveAt: '2026-09-10T10:00:00.000Z',
}

assert.deepEqual(evaluateTenantSubscriptionChange(base), {
  allowed: true,
  scope: 'tenant',
  subscriptionDomain: 'platform_subscription',
  subscriptionId: 'sub-1',
  from: 'due_soon',
  to: 'active',
  effectiveAt: '2026-09-10T10:00:00.000Z',
})
assert.deepEqual(evaluateTenantSubscriptionChange({ ...base, requestedTenantId: 'tenant-b' }), { allowed: false, reason: 'tenant_scope_mismatch' })
assert.deepEqual(evaluateTenantSubscriptionChange({ ...base, actorRole: 'tenant_owner' }), { allowed: false, reason: 'operator_role_required' })
assert.deepEqual(evaluateTenantSubscriptionChange({ ...base, subscriptionDomain: 'end_customer_payment' }), { allowed: false, reason: 'invalid_subscription_domain' })
assert.deepEqual(evaluateTenantSubscriptionChange({ ...base, providerMutation: true }), { allowed: false, reason: 'provider_mutation_forbidden' })
assert.deepEqual(evaluateTenantSubscriptionChange({ ...base, operatorApproved: false }), { allowed: false, reason: 'operator_approval_required' })
assert.deepEqual(evaluateTenantSubscriptionChange({ ...base, targetState: 'unknown' }), { allowed: false, reason: 'invalid_transition' })
assert.deepEqual(evaluateTenantSubscriptionChange({ ...base, currentState: 'ended', targetState: 'active' }), { allowed: false, reason: 'invalid_transition' })
assert.deepEqual(evaluateTenantSubscriptionChange({ ...base, effectiveAt: 'not-a-date' }), { allowed: false, reason: 'effective_date_invalid' })

const safeDecision = JSON.stringify(evaluateTenantSubscriptionChange(base))
assert(!safeDecision.includes('OPS-100') && !safeDecision.includes('end_customer'), 'decision must not expose approval or customer payment details')

console.log('v4-external-subscription.test: PASS')
