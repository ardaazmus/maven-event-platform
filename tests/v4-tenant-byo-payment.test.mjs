import assert from 'node:assert/strict'
import { evaluateTenantPaymentConnection } from '../src/lib/tenant-payment-connection.ts'

const base = {
  tenantId: 'tenant-a',
  workspaceId: 'workspace-a',
  tenantWorkspaceId: 'workspace-a',
  connectionWorkspaceId: 'workspace-a',
  provider: 'iyzico',
  mode: 'test',
  releaseGateOpen: false,
}

assert.deepEqual(
  evaluateTenantPaymentConnection(base),
  { ok: true, scope: 'tenant', provider: 'iyzico', mode: 'test' },
  'a test connection must be accepted only inside the owning tenant scope',
)
assert.deepEqual(
  evaluateTenantPaymentConnection({ ...base, connectionWorkspaceId: 'workspace-b' }),
  { ok: false, reason: 'workspace_mismatch' },
  'a connection from another workspace must fail closed',
)
assert.deepEqual(
  evaluateTenantPaymentConnection({ ...base, tenantWorkspaceId: 'workspace-b' }),
  { ok: false, reason: 'tenant_workspace_mismatch' },
  'a tenant must not use a workspace outside its own tenant mapping',
)
assert.deepEqual(
  evaluateTenantPaymentConnection({ ...base, provider: 'unknown' }),
  { ok: false, reason: 'provider_invalid' },
  'unknown providers must not cross the provider boundary',
)
assert.deepEqual(
  evaluateTenantPaymentConnection({ ...base, mode: 'live' }),
  { ok: false, reason: 'live_gate_closed' },
  'live connections stay closed until an explicit server release gate opens',
)
assert.deepEqual(
  evaluateTenantPaymentConnection({ ...base, tenantId: '' }),
  { ok: false, reason: 'input_invalid' },
  'missing tenant identity must fail closed',
)

console.log('v4-tenant-byo-payment.test: PASS (tenant BYO payment boundary)')
