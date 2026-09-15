import assert from 'node:assert/strict'
import { normalizeConnectionDescriptor } from '../src/lib/connection-purpose-contract.ts'

assert.deepEqual(
  normalizeConnectionDescriptor({ connectionId: 'conn-1', tenantId: 'tenant-1', workspaceId: 'workspace-1', purpose: 'payment', environment: 'test', state: 'enabled', provider: 'IYZICO' }, 'workspace-1'),
  { ok: true, connection: { connectionId: 'conn-1', tenantId: 'tenant-1', workspaceId: 'workspace-1', purpose: 'payment', environment: 'test', state: 'enabled', provider: 'iyzico' } },
)
assert.deepEqual(
  normalizeConnectionDescriptor({ connectionId: 'conn-2', tenantId: 'tenant-1', workspaceId: 'workspace-1', purpose: 'invoice', environment: 'staging', state: 'verifying', provider: 'Paraşüt' }),
  { ok: true, connection: { connectionId: 'conn-2', tenantId: 'tenant-1', workspaceId: 'workspace-1', purpose: 'invoice', environment: 'staging', state: 'verifying', provider: 'paraşüt' } },
)
assert.deepEqual(normalizeConnectionDescriptor({ connectionId: 'conn-1', tenantId: 'tenant-1', workspaceId: 'workspace-1', purpose: 'checkout', environment: 'test', state: 'draft', provider: 'stripe' }), { ok: false, reason: 'purpose_invalid' })
assert.deepEqual(normalizeConnectionDescriptor({ connectionId: 'conn-1', tenantId: 'tenant-1', workspaceId: 'workspace-1', purpose: 'mail', environment: 'production', state: 'draft', provider: 'smtp' }), { ok: false, reason: 'environment_invalid' })
assert.deepEqual(normalizeConnectionDescriptor({ connectionId: 'conn-1', tenantId: 'tenant-1', workspaceId: 'workspace-2', purpose: 'media', environment: 'test', state: 'draft', provider: 'local' }, 'workspace-1'), { ok: false, reason: 'workspace_mismatch' })
assert.deepEqual(normalizeConnectionDescriptor({ connectionId: 'conn-1', tenantId: 'tenant-1', workspaceId: 'workspace-1', purpose: 'payment', environment: 'test', state: 'draft', provider: 'stripe', apiKey: 'not-allowed' }), { ok: false, reason: 'secret_forbidden' })

console.log('connection-purpose-contract.test: PASS (R10-V4-11)')
