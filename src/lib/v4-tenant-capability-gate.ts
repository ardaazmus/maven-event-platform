export const V4_BYO_CAPABILITIES = Object.freeze(['payment', 'manual_invoice', 'transactional_mail', 'parasut'] as const)
export const V4_CAPABILITY_MODES = Object.freeze(['test', 'live'] as const)

export type V4ByoCapability = (typeof V4_BYO_CAPABILITIES)[number]
export type V4CapabilityMode = (typeof V4_CAPABILITY_MODES)[number]

export type V4TenantCapabilityResult =
  | {
      ok: true
      capability: V4ByoCapability
      scope: 'tenant'
      mode: V4CapabilityMode
      productionMutationAllowed: boolean
    }
  | {
      ok: false
      reason:
        | 'input_invalid'
        | 'sensitive_metadata_not_allowed'
        | 'tenant_scope_mismatch'
        | 'workspace_mismatch'
        | 'tenant_not_active'
        | 'entitlement_required'
        | 'capability_not_verified'
        | 'capability_deferred'
        | 'live_gate_closed'
    }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isSafeIdentifier(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/u.test(value)
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]) {
  return Object.keys(value).every(key => keys.includes(key))
}

/** Evaluates V4 tenant/BYO capability facts without connecting or mutating a provider. */
export function evaluateV4TenantCapability(input: unknown): V4TenantCapabilityResult {
  if (!isRecord(input)) return { ok: false, reason: 'input_invalid' }
  if (!hasOnlyKeys(input, ['tenantId', 'requestedTenantId', 'workspaceId', 'tenantWorkspaceId', 'connectionWorkspaceId', 'capability', 'tenantStatus', 'entitlementEnabled', 'capabilityStatus', 'mode', 'productionR10Evidence'])) return { ok: false, reason: 'sensitive_metadata_not_allowed' }
  if (!isSafeIdentifier(input.tenantId) || !isSafeIdentifier(input.requestedTenantId) || !isSafeIdentifier(input.workspaceId) || !isSafeIdentifier(input.tenantWorkspaceId) || !isSafeIdentifier(input.connectionWorkspaceId)) return { ok: false, reason: 'input_invalid' }
  if (!V4_BYO_CAPABILITIES.includes(input.capability as V4ByoCapability) || !V4_CAPABILITY_MODES.includes(input.mode as V4CapabilityMode) || !['active', 'suspended'].includes(input.tenantStatus as string) || !['verified', 'unknown', 'blocked'].includes(input.capabilityStatus as string) || typeof input.entitlementEnabled !== 'boolean' || typeof input.productionR10Evidence !== 'boolean') return { ok: false, reason: 'input_invalid' }
  if (input.tenantId !== input.requestedTenantId || input.tenantWorkspaceId !== input.workspaceId) return { ok: false, reason: 'tenant_scope_mismatch' }
  if (input.connectionWorkspaceId !== input.workspaceId) return { ok: false, reason: 'workspace_mismatch' }
  if (input.tenantStatus !== 'active') return { ok: false, reason: 'tenant_not_active' }
  if (input.entitlementEnabled !== true) return { ok: false, reason: 'entitlement_required' }
  if (input.capability === 'parasut') return { ok: false, reason: 'capability_deferred' }
  if (input.capabilityStatus !== 'verified') return { ok: false, reason: 'capability_not_verified' }
  if (input.mode === 'live' && input.productionR10Evidence !== true) return { ok: false, reason: 'live_gate_closed' }
  const capability = input.capability as V4ByoCapability
  const mode = input.mode as V4CapabilityMode

  return {
    ok: true,
    capability,
    scope: 'tenant',
    mode,
    productionMutationAllowed: mode === 'live',
  }
}
