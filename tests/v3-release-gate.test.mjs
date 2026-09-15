import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { evaluateFirstPartyPaymentScope, evaluateR10PilotGate } from '../src/lib/r10-scope-gate.ts'

const status = readFileSync('STATUS.md', 'utf8')
const decision = readFileSync('RELEASE-DECISION.md', 'utf8')
const plan = readFileSync('docs/superpowers/plans/2026-09-06-mavenforms-release-modules-first-party-saas-roadmap.md', 'utf8')

assert(status.includes('V3-04') && status.includes('V3-05'), 'status must preserve the V3 release gate sequence')
assert(decision.includes('NO-GO'), 'release must remain closed without external evidence')
assert(decision.includes('V3-05 Paraşüt otomatik faturalama çıkış kapısı'), 'release decision must contain the V3 gate section')
assert(plan.includes('### V3-05 — V3 otomatik faturalama çıkış kapısı'), 'roadmap must retain the V3 release gate')
assert(decision.includes('Paraşüt') && decision.includes('mali müşavir'), 'provider and accounting evidence must remain explicit')

const staging = {
  scope: 'first_party',
  environment: 'staging',
  serverSideMerchantIdentity: true,
  providerSandboxEvidence: true,
  manualInvoiceWorkflowReady: true,
  accountantApprovalPathReady: true,
  documentReady: true,
  transactionalSenderHealthy: true,
  testRecipientAllowlist: true,
  productionR10Evidence: false,
}
assert.equal(evaluateR10PilotGate(staging).decision, 'first_party_limited')
assert.equal(evaluateR10PilotGate({ ...staging, environment: 'production' }).decision, 'blocked')
assert.equal(evaluateR10PilotGate({ ...staging, providerSandboxEvidence: false }).capabilities.paymentSandbox, false)
assert.deepEqual(
  evaluateFirstPartyPaymentScope({ scope: 'saas', environment: 'staging', workspaceId: 'workspace-fixture', merchantWorkspaceId: 'workspace-fixture' }),
  { ok: false, reason: 'saas_scope_deferred' },
)

assert(!decision.includes('V3 otomatik faturalama: GO'), 'V3 must not be presented as automatically released')
assert(!decision.includes('tenant end-customer collection enabled'), 'V3 must not enable SaaS tenant collection')

console.log('v3-release-gate.test: PASS (NO-GO without external evidence)')
