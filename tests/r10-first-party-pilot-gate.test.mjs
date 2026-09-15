import assert from 'node:assert/strict'
import { evaluateR10PilotGate } from '../src/lib/r10-scope-gate.ts'

const ready = {
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

assert.deepEqual(evaluateR10PilotGate(ready), {
  decision: 'first_party_limited',
  capabilities: { paymentSandbox: true, manualInvoiceReview: true, invoiceDeliveryTest: true },
  blockedReasons: [],
})

assert.equal(evaluateR10PilotGate({ ...ready, scope: 'saas' }).decision, 'blocked')
assert.match(evaluateR10PilotGate({ ...ready, scope: 'saas' }).blockedReasons.join(','), /saas_deferred/)
assert.equal(evaluateR10PilotGate({ ...ready, environment: 'production' }).decision, 'blocked')
assert.match(evaluateR10PilotGate({ ...ready, environment: 'production' }).blockedReasons.join(','), /production_requires_global_r10_evidence/)
assert.equal(evaluateR10PilotGate({ ...ready, providerSandboxEvidence: false }).capabilities.paymentSandbox, false)
assert.equal(evaluateR10PilotGate({ ...ready, documentReady: false }).capabilities.invoiceDeliveryTest, false)
assert.equal(evaluateR10PilotGate({ ...ready, manualInvoiceWorkflowReady: false }).capabilities.manualInvoiceReview, false)

console.log('r10-first-party-pilot-gate.test: PASS')
