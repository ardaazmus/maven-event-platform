import { TENANT_ENTITLED_MODULES, type ModuleDecision, type ProductModule } from '@/lib/release-module'

export type TenantEntitlementInput = {
  tenantId: unknown
  requestedTenantId: unknown
  status: 'active' | 'suspended'
  enabledModules: readonly ProductModule[]
  module: ProductModule
}

function denied(module: ProductModule, reason: ModuleDecision['reason']): ModuleDecision {
  return { module, enabled: false, reason, scope: 'tenant' }
}

/**
 * Evaluates a tenant-owned module decision from server-provided context.
 * Callers must load tenantId, status and enabledModules server-side; request
 * data is used only as a matching subject and can never grant access.
 */
export function evaluateTenantModuleAccess(input: TenantEntitlementInput): ModuleDecision {
  if (typeof input.tenantId !== 'string' || typeof input.requestedTenantId !== 'string' || input.tenantId !== input.requestedTenantId) {
    return denied(input.module, 'security_gate')
  }
  if (input.status === 'suspended') return denied(input.module, 'tenant_suspended')
  if (!TENANT_ENTITLED_MODULES.includes(input.module)) return denied(input.module, 'security_gate')
  if (!input.enabledModules.includes(input.module)) return denied(input.module, 'admin_disabled')
  return { module: input.module, enabled: true, reason: 'version_entitlement', scope: 'tenant' }
}
