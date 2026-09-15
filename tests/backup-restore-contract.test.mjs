import assert from 'node:assert/strict'
import { createBackupManifest, evaluateBackupRestore } from '../src/lib/backup-restore-contract.ts'

const archiveSha256 = 'a'.repeat(64)
const contentSha256 = 'b'.repeat(64)
const base = {
  backupId: 'backup-001',
  workspaceId: 'workspace-001',
  createdAtMs: 1_000,
  archiveSha256,
  auditEventId: 'audit-001',
  secretValuesIncluded: false,
  secretReferenceCount: 2,
  entries: [
    { resource: 'form', recordId: 'form-001', workspaceId: 'workspace-001', contentSha256 },
    { resource: 'submission', recordId: 'submission-001', workspaceId: 'workspace-001', contentSha256 },
  ],
}

const created = createBackupManifest(base)
assert.equal(created.ok, true)
assert.deepEqual(created.manifest, {
  version: 'v1',
  backupId: 'backup-001',
  workspaceId: 'workspace-001',
  createdAtMs: 1_000,
  entryCount: 2,
  resources: { form: 1, submission: 1, payment: 0, invoice: 0, document: 0, delivery: 0, badge: 0 },
  archiveSha256,
  auditEventId: 'audit-001',
  secretStorage: 'external_only',
  secretReferenceCount: 2,
  secretValuesIncluded: false,
})

assert.deepEqual(createBackupManifest({ ...base, entries: [...base.entries, { ...base.entries[0], recordId: 'form-002', workspaceId: 'workspace-002' }] }), { ok: false, reason: 'scope_mismatch' })
assert.deepEqual(createBackupManifest({ ...base, entries: [...base.entries, base.entries[0]] }), { ok: false, reason: 'duplicate_entry' })
assert.deepEqual(createBackupManifest({ ...base, secretValuesIncluded: true }), { ok: false, reason: 'secret_values_not_allowed' })

const restoreBase = {
  manifest: created.manifest,
  requestedWorkspaceId: 'workspace-001',
  actualArchiveSha256: archiveSha256,
  environment: 'disposable',
  migrationsApplied: true,
  readinessOk: true,
  auditEventId: 'audit-001',
  secretValuesAvailable: false,
}
assert.deepEqual(evaluateBackupRestore(restoreBase), {
  ok: true,
  decision: { action: 'restore', environment: 'disposable', workspaceId: 'workspace-001', entryCount: 2, archiveSha256, auditEventId: 'audit-001', secretStorage: 'external_only' },
})
assert.deepEqual(evaluateBackupRestore({ ...restoreBase, environment: 'production' }), { ok: false, reason: 'environment_not_allowed' })
assert.deepEqual(evaluateBackupRestore({ ...restoreBase, actualArchiveSha256: 'c'.repeat(64) }), { ok: false, reason: 'hash_mismatch' })
assert.deepEqual(evaluateBackupRestore({ ...restoreBase, requestedWorkspaceId: 'workspace-002' }), { ok: false, reason: 'scope_mismatch' })
assert.deepEqual(evaluateBackupRestore({ ...restoreBase, auditEventId: 'audit-002' }), { ok: false, reason: 'audit_mismatch' })
assert.deepEqual(evaluateBackupRestore({ ...restoreBase, migrationsApplied: false }), { ok: false, reason: 'migration_required' })
assert.deepEqual(evaluateBackupRestore({ ...restoreBase, readinessOk: false }), { ok: false, reason: 'readiness_required' })
assert.deepEqual(evaluateBackupRestore({ ...restoreBase, secretValuesAvailable: true }), { ok: false, reason: 'secret_values_not_allowed' })
assert.equal(JSON.stringify(evaluateBackupRestore(restoreBase)).includes('form-001'), false)

console.log('backup-restore-contract.test: PASS (R10-V4-38)')
