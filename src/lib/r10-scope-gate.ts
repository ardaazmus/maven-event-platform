import type { AppEnvironment } from '@/lib/env'

export type R10Scope = 'first_party' | 'saas'
export type R10Environment = AppEnvironment

export const R10_EVIDENCE_CLASSES = ['E0', 'E1', 'E2', 'E3', 'E4', 'E5', 'E6'] as const
export type R10EvidenceClass = (typeof R10_EVIDENCE_CLASSES)[number]

export const R10_RUNTIME_EVIDENCE_STATUSES = ['LOCAL_PASS', 'PILOT_PASS', 'RELEASE_PASS'] as const
export type R10RuntimeEvidenceStatus = (typeof R10_RUNTIME_EVIDENCE_STATUSES)[number]

export type R10EvidenceRecord = {
  evidenceClass: R10EvidenceClass
  runtimeEvidenceStatus: R10RuntimeEvidenceStatus
}

export type R10LiveMutationInput = {
  environment: R10Environment
  operation: 'sandbox' | 'live'
  liveSecretProvided: boolean
  productionR10Evidence: boolean
}

export type R10LiveMutationResult =
  | { allowed: true; reason: 'sandbox_only' | 'production_evidence_verified' }
  | { allowed: false; reason: 'non_production_live_endpoint_forbidden' | 'non_production_live_secret_forbidden' | 'production_requires_r10_evidence' | 'live_secret_required' }

/**
 * Keeps live provider mutation closed outside production and without the
 * external R-10 release evidence. Callers must derive environment and
 * evidence on the server; request fields cannot override this decision.
 */
export function evaluateR10LiveMutation(input: R10LiveMutationInput): R10LiveMutationResult {
  if (input.operation === 'sandbox') {
    return input.liveSecretProvided
      ? { allowed: false, reason: 'non_production_live_secret_forbidden' }
      : { allowed: true, reason: 'sandbox_only' }
  }
  if (input.environment !== 'production') return { allowed: false, reason: 'non_production_live_endpoint_forbidden' }
  if (!input.productionR10Evidence) return { allowed: false, reason: 'production_requires_r10_evidence' }
  if (!input.liveSecretProvided) return { allowed: false, reason: 'live_secret_required' }
  return { allowed: true, reason: 'production_evidence_verified' }
}

export function normalizeR10EvidenceRecord(input: unknown): R10EvidenceRecord | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  const value = input as Record<string, unknown>
  if (!(R10_EVIDENCE_CLASSES as readonly string[]).includes(value.evidenceClass as string)) return null
  if (!(R10_RUNTIME_EVIDENCE_STATUSES as readonly string[]).includes(value.runtimeEvidenceStatus as string)) return null
  return {
    evidenceClass: value.evidenceClass as R10EvidenceClass,
    runtimeEvidenceStatus: value.runtimeEvidenceStatus as R10RuntimeEvidenceStatus,
  }
}

export type R10PilotGateInput = {
  scope: R10Scope
  environment: R10Environment
  serverSideMerchantIdentity: boolean
  providerSandboxEvidence: boolean
  manualInvoiceWorkflowReady: boolean
  accountantApprovalPathReady: boolean
  documentReady: boolean
  transactionalSenderHealthy: boolean
  testRecipientAllowlist: boolean
  productionR10Evidence: boolean
}

export type R10PilotGateResult = {
  decision: 'first_party_limited' | 'blocked' | 'production_ready'
  capabilities: {
    paymentSandbox: boolean
    manualInvoiceReview: boolean
    invoiceDeliveryTest: boolean
  }
  blockedReasons: string[]
}

export type FirstPartyPaymentScopeResult =
  | { ok: true; scope: 'first_party'; environment: 'local' | 'staging' }
  | { ok: false; reason: 'input_invalid' | 'saas_scope_deferred' | 'production_requires_global_r10_evidence' | 'workspace_identity_required' | 'merchant_workspace_mismatch' | 'client_scope_not_authoritative' }

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

/**
 * Binds the first-party payment pilot to a server-owned workspace identity.
 * Callers must derive scope and merchantWorkspaceId on the server; a browser
 * supplied scope is deliberately rejected instead of being interpreted.
 */
export function evaluateFirstPartyPaymentScope(input: unknown): FirstPartyPaymentScopeResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, reason: 'input_invalid' }
  const value = input as Record<string, unknown>
  if (Object.prototype.hasOwnProperty.call(value, 'clientRequestedScope')) return { ok: false, reason: 'client_scope_not_authoritative' }
  if (value.scope !== 'first_party') return { ok: false, reason: value.scope === 'saas' ? 'saas_scope_deferred' : 'input_invalid' }
  if (value.environment === 'production') return { ok: false, reason: 'production_requires_global_r10_evidence' }
  if (value.environment !== 'local' && value.environment !== 'staging') return { ok: false, reason: 'input_invalid' }
  if (!nonEmptyString(value.workspaceId) || !nonEmptyString(value.merchantWorkspaceId)) return { ok: false, reason: 'workspace_identity_required' }
  if (value.workspaceId !== value.merchantWorkspaceId) return { ok: false, reason: 'merchant_workspace_mismatch' }
  return { ok: true, scope: 'first_party', environment: value.environment }
}

/**
 * Separates the first-party development pilot from the global R-10 release gate.
 * This is a server-side policy contract; it never treats a browser callback,
 * synthetic fixture, or UI state as provider or production evidence.
 */
export function evaluateR10PilotGate(input: R10PilotGateInput): R10PilotGateResult {
  const blockedReasons: string[] = []
  const firstParty = input.scope === 'first_party'
  const nonProduction = input.environment === 'local' || input.environment === 'staging'
  const paymentSandbox = firstParty && nonProduction && input.serverSideMerchantIdentity && input.providerSandboxEvidence
  const manualInvoiceReview = firstParty
    && (nonProduction || input.productionR10Evidence)
    && input.manualInvoiceWorkflowReady
    && input.accountantApprovalPathReady
  const invoiceDeliveryTest = manualInvoiceReview && nonProduction && input.documentReady && input.transactionalSenderHealthy && input.testRecipientAllowlist

  if (!firstParty) blockedReasons.push('saas_deferred_until_first_party_and_release_gates_pass')
  if (!input.serverSideMerchantIdentity) blockedReasons.push('server_side_merchant_identity_required')
  if (!input.providerSandboxEvidence) blockedReasons.push('real_provider_sandbox_evidence_required_for_payment')
  if (!input.manualInvoiceWorkflowReady) blockedReasons.push('manual_accounting_upload_workflow_required')
  if (!input.accountantApprovalPathReady) blockedReasons.push('accountant_or_authorized_review_required')
  if (!nonProduction) blockedReasons.push('production_requires_global_r10_evidence')
  if (!input.documentReady) blockedReasons.push('document_ready_required_for_invoice_delivery')
  if (!input.transactionalSenderHealthy) blockedReasons.push('dedicated_transactional_sender_required')
  if (nonProduction && !input.testRecipientAllowlist) blockedReasons.push('non_production_delivery_requires_test_recipient_allowlist')

  const productionReady = firstParty
    && input.environment === 'production'
    && input.productionR10Evidence
    && input.serverSideMerchantIdentity
    && input.providerSandboxEvidence
    && manualInvoiceReview
    && input.documentReady
    && input.transactionalSenderHealthy

  if (productionReady) return { decision: 'production_ready', capabilities: { paymentSandbox: true, manualInvoiceReview: true, invoiceDeliveryTest: true }, blockedReasons: [] }
  if (paymentSandbox || manualInvoiceReview || invoiceDeliveryTest) return { decision: 'first_party_limited', capabilities: { paymentSandbox, manualInvoiceReview, invoiceDeliveryTest }, blockedReasons }
  return { decision: 'blocked', capabilities: { paymentSandbox, manualInvoiceReview, invoiceDeliveryTest }, blockedReasons }
}
