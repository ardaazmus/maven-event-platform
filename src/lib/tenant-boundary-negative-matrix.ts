export const TENANT_BOUNDARY_OPERATIONS = Object.freeze(['upload', 'connection', 'document', 'export'] as const)
export type TenantBoundaryOperation = (typeof TENANT_BOUNDARY_OPERATIONS)[number]

export type TenantBoundaryResult =
  | { allowed: true; status: 200; operation: TenantBoundaryOperation }
  | { allowed: false; status: 400 | 403 | 404; reason: 'input_invalid' | 'resource_not_found' | 'workspace_mismatch' | 'form_scope_mismatch' | 'capability_denied' | 'client_scope_not_authoritative' }

export type TenantBoundaryInput = Readonly<{
  operation?: unknown
  actorWorkspaceId?: unknown
  resourceWorkspaceId?: unknown
  resourceExists?: unknown
  actorCanAccess?: unknown
  resourceFormId?: unknown
  requestedFormId?: unknown
  clientTenantId?: unknown
  clientWorkspaceId?: unknown
}>

function text(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

/** Normalizes cross-tenant access outcomes without reading or mutating a resource. */
export function evaluateTenantBoundary(input: TenantBoundaryInput): TenantBoundaryResult {
  if (!(TENANT_BOUNDARY_OPERATIONS as readonly unknown[]).includes(input.operation)) return { allowed: false, status: 400, reason: 'input_invalid' }
  if (Object.prototype.hasOwnProperty.call(input, 'clientTenantId') || Object.prototype.hasOwnProperty.call(input, 'clientWorkspaceId')) return { allowed: false, status: 403, reason: 'client_scope_not_authoritative' }
  if (!text(input.actorWorkspaceId) || !text(input.resourceWorkspaceId)) return { allowed: false, status: 400, reason: 'input_invalid' }
  if (input.resourceExists !== true) return { allowed: false, status: 404, reason: 'resource_not_found' }
  if (input.actorWorkspaceId !== input.resourceWorkspaceId) return { allowed: false, status: 403, reason: 'workspace_mismatch' }
  if (input.resourceFormId !== undefined && input.requestedFormId !== undefined && input.resourceFormId !== input.requestedFormId) return { allowed: false, status: 403, reason: 'form_scope_mismatch' }
  if (input.actorCanAccess !== true) return { allowed: false, status: 403, reason: 'capability_denied' }
  return { allowed: true, status: 200, operation: input.operation as TenantBoundaryOperation }
}
