import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { evaluateSupportAccess } from '../src/lib/support-access-policy.ts'
import { evaluateTenantInvoiceMailBoundary } from '../src/lib/tenant-invoice-mail.ts'
import { evaluateTenantSubscriptionChange } from '../src/lib/subscription-state.ts'
import { evaluateTenantSuspensionAction } from '../src/lib/tenant-suspension-policy.ts'

const status = readFileSync('STATUS.md', 'utf8')
const decision = readFileSync('RELEASE-DECISION.md', 'utf8')
const plan = readFileSync('docs/superpowers/plans/2026-09-06-mavenforms-release-modules-first-party-saas-roadmap.md', 'utf8')

for (const phase of ['V4-03', 'V4-04', 'V4-05', 'V4-06', 'V4-07']) assert(status.includes(phase), `${phase} must be recorded`)
assert(decision.includes('V4-07 SaaS release ve tenant isolation kapısı'), 'V4 release gate must be recorded')
assert(decision.includes('NO-GO'), 'missing external evidence must keep V4 closed')
assert(decision.includes('tenant adına end-customer para tutmaz'), 'platform and tenant collection must remain separate')
assert(decision.includes('Live provider') && decision.includes('backup/restore') && decision.includes('legal/DPA'), 'external release evidence must remain explicit')
assert(plan.includes('### V4-07 — SaaS release ve tenant isolation kapısı'), 'roadmap must retain the V4 gate')

assert.deepEqual(evaluateSupportAccess({ tenantId: 'tenant-a', requestedTenantId: 'tenant-b', operatorRole: 'platform_support', supportIdentityId: 'support-identity' }), { allowed: false, reason: 'tenant_scope_mismatch' })
assert.deepEqual(evaluateTenantInvoiceMailBoundary({ tenantId: 'tenant-a', invoiceWorkspaceId: 'tenant-a', documentWorkspaceId: 'tenant-b', senderWorkspaceId: 'tenant-a' }), { allowed: false, scope: 'tenant', reason: 'tenant_scope_mismatch' })
assert.deepEqual(evaluateTenantSubscriptionChange({ tenantId: 'tenant-a', requestedTenantId: 'tenant-b', subscriptionId: 'sub-1' }), { allowed: false, reason: 'tenant_scope_mismatch' })
assert.deepEqual(evaluateTenantSuspensionAction({ tenantId: 'tenant-a', requestedTenantId: 'tenant-b', action: 'public_read' }), { allowed: false, reason: 'tenant_scope_mismatch' })

assert(!decision.includes('V4 production: GO'), 'V4 must not be presented as production-ready')
assert(!decision.includes('MavenForms tenant end-customer collection enabled'), 'V4 must not enable platform collection')

console.log('v4-release-gate.test: PASS (NO-GO without external evidence)')
