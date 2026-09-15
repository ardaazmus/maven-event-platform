export const TENANT_SUSPENSION_ACTIONS = [
  'public_read',
  'create_form',
  'publish_form',
  'delete_form',
  'export_submissions',
  'subscription_read',
  'suspend',
  'reactivate',
] as const
export type TenantSuspensionAction = (typeof TENANT_SUSPENSION_ACTIONS)[number]
type PublicFormState = 'published' | 'deactivated' | 'not_applicable'

export type TenantSuspensionDecision =
  | { allowed: true; scope: 'tenant'; action: TenantSuspensionAction; status: 'active' | 'suspended'; dataPreserved: true; publicForm: PublicFormState }
  | { allowed: false; reason: TenantSuspensionFailure }

export type TenantSuspensionFailure =
  | 'invalid_request'
  | 'tenant_scope_mismatch'
  | 'tenant_suspended'
  | 'published_snapshot_required'
  | 'export_permission_required'
  | 'role_not_allowed'
  | 'subscription_operator_required'
  | 'reactivation_state_not_preserved'

const EXPORT_ROLES = ['owner', 'admin', 'accounting', 'form_manager', 'analyst', 'reviewer', 'viewer']

function isAction(value: unknown): value is TenantSuspensionAction {
  return typeof value === 'string' && (TENANT_SUSPENSION_ACTIONS as readonly string[]).includes(value)
}

function allowedResult(action: TenantSuspensionAction, status: 'active' | 'suspended', publicForm: PublicFormState): TenantSuspensionDecision {
  return { allowed: true, scope: 'tenant', action, status, dataPreserved: true, publicForm }
}

/**
 * Evaluates suspend/reactivate capability without mutating forms or data.
 * Server callers must provide tenant state and permission facts loaded from
 * the database; request fields cannot grant cross-tenant access.
 */
export function evaluateTenantSuspensionAction(inputValue: unknown): TenantSuspensionDecision {
  if (typeof inputValue !== 'object' || inputValue === null || Array.isArray(inputValue)) return { allowed: false, reason: 'invalid_request' }
  const input = inputValue as Record<string, unknown>
  if (typeof input.tenantId !== 'string' || typeof input.requestedTenantId !== 'string' || input.tenantId !== input.requestedTenantId) return { allowed: false, reason: 'tenant_scope_mismatch' }
  if (input.tenantStatus !== 'active' && input.tenantStatus !== 'suspended') return { allowed: false, reason: 'invalid_request' }
  if (!isAction(input.action)) return { allowed: false, reason: 'invalid_request' }
  const action = input.action

  if (action === 'public_read' || action === 'create_form' || action === 'publish_form' || action === 'delete_form') {
    if (input.tenantStatus === 'suspended') return { allowed: false, reason: 'tenant_suspended' }
    if (action === 'public_read' && input.publishedSnapshotAvailable !== true) return { allowed: false, reason: 'published_snapshot_required' }
    return allowedResult(action, 'active', action === 'public_read' ? 'published' : 'not_applicable')
  }

  if (action === 'export_submissions') {
    if (input.exportPermission !== true) return { allowed: false, reason: 'export_permission_required' }
    if (typeof input.actorRole !== 'string' || !EXPORT_ROLES.includes(input.actorRole)) return { allowed: false, reason: 'role_not_allowed' }
    return allowedResult(action, input.tenantStatus, 'not_applicable')
  }

  if (action === 'subscription_read') {
    if (input.actorRole !== 'owner' && input.actorRole !== 'admin') return { allowed: false, reason: 'role_not_allowed' }
    return allowedResult(action, input.tenantStatus, 'not_applicable')
  }

  if (input.actorRole !== 'platform_operator') return { allowed: false, reason: 'subscription_operator_required' }
  if (action === 'suspend' && input.tenantStatus === 'active') return allowedResult(action, 'suspended', 'deactivated')
  if (action === 'reactivate' && input.tenantStatus === 'suspended') {
    if (input.publishedSnapshotAvailable !== true || input.idempotencyStatePreserved !== true || input.dataPreserved !== true) return { allowed: false, reason: 'reactivation_state_not_preserved' }
    return allowedResult(action, 'active', 'published')
  }
  return { allowed: false, reason: 'invalid_request' }
}
