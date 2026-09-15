export const SUPPORT_READ_SCOPES = ['form_metadata', 'form_structure', 'submission_status', 'delivery_status'] as const
export type SupportReadScope = (typeof SUPPORT_READ_SCOPES)[number]

export type SupportAccessDecision =
  | { allowed: true; scope: 'tenant'; mode: 'read_only'; resources: SupportReadScope[]; expiresAt: string }
  | { allowed: false; reason: SupportAccessFailure }

export type SupportAccessFailure =
  | 'invalid_request'
  | 'operator_not_support'
  | 'tenant_scope_mismatch'
  | 'tenant_not_active'
  | 'module_disabled'
  | 'tenant_approval_required'
  | 'approval_expired'
  | 'approval_revoked'
  | 'mfa_required'
  | 'step_up_required'
  | 'read_only_required'
  | 'resource_not_allowed'
  | 'reason_required'
  | 'ticket_required'
  | 'expiry_invalid'

type SupportAccessInput = {
  tenantId: unknown
  requestedTenantId: unknown
  tenantStatus: unknown
  moduleEnabled: unknown
  operatorRole: unknown
  supportIdentityId: unknown
  mode: unknown
  resources: unknown
  tenantApproval: unknown
  mfaVerified: unknown
  stepUpVerified: unknown
  reason: unknown
  ticketReference: unknown
  expiresAt: unknown
  now: unknown
}

type TenantApproval = {
  granted: boolean
  approvalId: string
  approvedByUserId: string
  expiresAt: string
  revokedAt: string | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function asInput(value: unknown): SupportAccessInput | null {
  if (!isRecord(value)) return null
  return value as unknown as SupportAccessInput
}

function asTenantApproval(value: unknown): TenantApproval | null {
  if (!isRecord(value)) return null
  if (
    typeof value.granted !== 'boolean' ||
    typeof value.approvalId !== 'string' ||
    typeof value.approvedByUserId !== 'string' ||
    typeof value.expiresAt !== 'string' ||
    (value.revokedAt !== null && typeof value.revokedAt !== 'string')
  ) return null
  return value as unknown as TenantApproval
}

function isSupportReadScope(value: unknown): value is SupportReadScope {
  return typeof value === 'string' && (SUPPORT_READ_SCOPES as readonly string[]).includes(value)
}

function validDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
}

/**
 * Decides whether a narrowly scoped support access request may be issued.
 * The server must supply tenant state, approval and authentication facts;
 * request data cannot grant itself access. This function creates no session,
 * reads no PII and permits only bounded read-only diagnostic resources.
 */
export function evaluateSupportAccess(inputValue: unknown): SupportAccessDecision {
  const input = asInput(inputValue)
  if (!input) return { allowed: false, reason: 'invalid_request' }
  if (input.operatorRole !== 'platform_support' || typeof input.supportIdentityId !== 'string' || !input.supportIdentityId) return { allowed: false, reason: 'operator_not_support' }
  if (typeof input.tenantId !== 'string' || typeof input.requestedTenantId !== 'string' || input.tenantId !== input.requestedTenantId) return { allowed: false, reason: 'tenant_scope_mismatch' }
  if (input.tenantStatus !== 'active') return { allowed: false, reason: 'tenant_not_active' }
  if (input.moduleEnabled !== true) return { allowed: false, reason: 'module_disabled' }
  const approval = asTenantApproval(input.tenantApproval)
  if (!approval || approval.granted !== true || !approval.approvalId || !approval.approvedByUserId) return { allowed: false, reason: 'tenant_approval_required' }
  if (approval.revokedAt !== null) return { allowed: false, reason: 'approval_revoked' }
  if (!validDate(input.now) || !validDate(approval.expiresAt) || Date.parse(approval.expiresAt) <= Date.parse(input.now)) return { allowed: false, reason: 'approval_expired' }
  if (input.mfaVerified !== true) return { allowed: false, reason: 'mfa_required' }
  if (input.stepUpVerified !== true) return { allowed: false, reason: 'step_up_required' }
  if (input.mode !== 'read_only') return { allowed: false, reason: 'read_only_required' }
  if (!Array.isArray(input.resources) || input.resources.length === 0 || !input.resources.every(isSupportReadScope)) return { allowed: false, reason: 'resource_not_allowed' }
  if (typeof input.reason !== 'string' || input.reason.trim().length < 3 || input.reason.length > 240) return { allowed: false, reason: 'reason_required' }
  if (typeof input.ticketReference !== 'string' || input.ticketReference.trim().length < 1 || input.ticketReference.length > 120) return { allowed: false, reason: 'ticket_required' }
  if (!validDate(input.expiresAt)) return { allowed: false, reason: 'expiry_invalid' }
  const now = Date.parse(input.now)
  const expiry = Date.parse(input.expiresAt)
  const approvalExpiry = Date.parse(approval.expiresAt)
  if (expiry <= now || expiry > approvalExpiry || expiry - now > 60 * 60 * 1000) return { allowed: false, reason: 'expiry_invalid' }
  return { allowed: true, scope: 'tenant', mode: 'read_only', resources: [...input.resources], expiresAt: input.expiresAt }
}
