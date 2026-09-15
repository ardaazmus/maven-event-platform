import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { evaluateFirstPartyPaymentScope, evaluateR10PilotGate } from '../src/lib/r10-scope-gate.ts'

const decision = readFileSync('RELEASE-DECISION.md', 'utf8')
const status = readFileSync('STATUS.md', 'utf8')
const plan = readFileSync('docs/superpowers/plans/2026-09-06-mavenforms-release-modules-first-party-saas-roadmap.md', 'utf8')

assert(decision.includes('V2-09A'), 'release decision must record the current V2 gate revision')
assert(decision.includes('V2-09A first-party çıkış kapısı'), 'release decision must contain the first-party gate section')
assert(decision.includes('NO-GO'), 'missing external evidence must keep the release closed')
assert(decision.includes('iyzico') && decision.includes('mali müşavir'), 'first-party provider and accounting evidence must be explicit')
assert(status.includes('V2-08A') && status.includes('V2-09A'), 'status must preserve the revalidation chain and next gate')
assert(plan.includes('Stripe V3+') && plan.includes('Paraşüt'), 'deferred provider decisions must remain in the roadmap')

const pilot = {
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
assert.deepEqual(evaluateR10PilotGate(pilot).decision, 'first_party_limited')
assert.deepEqual(evaluateR10PilotGate({ ...pilot, environment: 'production' }).decision, 'blocked')
assert.deepEqual(evaluateFirstPartyPaymentScope({ scope: 'first_party', environment: 'production', workspaceId: 'workspace-1', merchantWorkspaceId: 'workspace-1' }), { ok: false, reason: 'production_requires_global_r10_evidence' })

assert(!decision.includes('GO — production'), 'local proof must not be presented as a production GO')
assert(!decision.includes('subscription billing enabled'), 'V2 must not enable SaaS subscription billing')

console.log('v2-release-gate.test: PASS (V2-09A)')
