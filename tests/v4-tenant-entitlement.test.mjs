import assert from 'node:assert/strict'
import { evaluateTenantModuleAccess } from '../src/lib/tenant-entitlement.ts'

const active = {
  tenantId: 'tenant-a',
  requestedTenantId: 'tenant-a',
  status: 'active',
  enabledModules: ['manual_invoices'],
}

assert.deepEqual(
  evaluateTenantModuleAccess({ ...active, module: 'manual_invoices' }),
  { module: 'manual_invoices', enabled: true, reason: 'version_entitlement', scope: 'tenant' },
  'an explicitly enabled tenant module must be available only in the active tenant',
)
assert.deepEqual(
  evaluateTenantModuleAccess({ ...active, module: 'online_payments' }),
  { module: 'online_payments', enabled: false, reason: 'admin_disabled', scope: 'tenant' },
  'a module not enabled for the tenant must fail closed',
)
assert.deepEqual(
  evaluateTenantModuleAccess({ ...active, module: 'manual_invoices', status: 'suspended' }),
  { module: 'manual_invoices', enabled: false, reason: 'tenant_suspended', scope: 'tenant' },
  'suspended tenants must lose module access without deleting data',
)
assert.deepEqual(
  evaluateTenantModuleAccess({ ...active, module: 'manual_invoices', requestedTenantId: 'tenant-b' }),
  { module: 'manual_invoices', enabled: false, reason: 'security_gate', scope: 'tenant' },
  'a cross-tenant entitlement request must fail closed',
)
assert.deepEqual(
  evaluateTenantModuleAccess({ ...active, module: 'support_break_glass', enabledModules: ['support_break_glass'] }),
  { module: 'support_break_glass', enabled: false, reason: 'security_gate', scope: 'tenant' },
  'support break-glass must not be tenant self-enabled by the entitlement matrix',
)

console.log('v4-tenant-entitlement.test: PASS (tenant entitlement contract)')
