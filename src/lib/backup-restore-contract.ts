export const BACKUP_RESOURCES = Object.freeze(['form', 'submission', 'payment', 'invoice', 'document', 'delivery', 'badge'] as const)
export const BACKUP_MAX_ENTRIES = 10_000
export const BACKUP_MAX_SECRET_REFERENCES = 1_000

export type BackupResource = (typeof BACKUP_RESOURCES)[number]

export type BackupManifest = Readonly<{
  version: 'v1'
  backupId: string
  workspaceId: string
  createdAtMs: number
  entryCount: number
  resources: Readonly<Record<BackupResource, number>>
  archiveSha256: string
  auditEventId: string
  secretStorage: 'external_only'
  secretReferenceCount: number
  secretValuesIncluded: false
}>

export type BackupManifestResult =
  | { ok: true; manifest: BackupManifest }
  | { ok: false; reason: 'input_invalid' | 'scope_mismatch' | 'duplicate_entry' | 'secret_values_not_allowed' }

export type BackupRestoreResult =
  | {
      ok: true
      decision: Readonly<{
        action: 'restore'
        environment: 'disposable' | 'staging'
        workspaceId: string
        entryCount: number
        archiveSha256: string
        auditEventId: string
        secretStorage: 'external_only'
      }>
    }
  | {
      ok: false
      reason:
        | 'input_invalid'
        | 'manifest_invalid'
        | 'environment_not_allowed'
        | 'scope_mismatch'
        | 'hash_mismatch'
        | 'audit_mismatch'
        | 'migration_required'
        | 'readiness_required'
        | 'secret_values_not_allowed'
    }

function safeIdentifier(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/u.test(value)
}

function safeSha256(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value)
}

function safeCount(value: unknown, max: number): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= max
}

function isBackupResource(value: unknown): value is BackupResource {
  return typeof value === 'string' && BACKUP_RESOURCES.includes(value as BackupResource)
}

function isManifest(value: unknown): value is BackupManifest {
  if (!value || typeof value !== 'object') return false
  const manifest = value as Record<string, unknown>
  if (
    manifest.version !== 'v1' ||
    !safeIdentifier(manifest.backupId) ||
    !safeIdentifier(manifest.workspaceId) ||
    !safeCount(manifest.createdAtMs, Number.MAX_SAFE_INTEGER) ||
    !safeCount(manifest.entryCount, BACKUP_MAX_ENTRIES) ||
    !safeSha256(manifest.archiveSha256) ||
    !safeIdentifier(manifest.auditEventId) ||
    manifest.secretStorage !== 'external_only' ||
    manifest.secretValuesIncluded !== false ||
    !safeCount(manifest.secretReferenceCount, BACKUP_MAX_SECRET_REFERENCES)
  ) return false

  if (!manifest.resources || typeof manifest.resources !== 'object') return false
  const resources = manifest.resources as Record<string, unknown>
  let total = 0
  for (const resource of BACKUP_RESOURCES) {
    if (!safeCount(resources[resource], BACKUP_MAX_ENTRIES)) return false
    total += resources[resource] as number
  }
  return total === manifest.entryCount
}

/** Builds a bounded, tenant-scoped manifest without reading or writing backup data. */
export function createBackupManifest(input: Readonly<{
  backupId: string
  workspaceId: string
  createdAtMs: number
  archiveSha256: string
  auditEventId: string
  secretValuesIncluded: boolean
  secretReferenceCount: number
  entries: ReadonlyArray<Readonly<{ resource: BackupResource; recordId: string; workspaceId: string; contentSha256: string }>>
}>): BackupManifestResult {
  if (!input || typeof input !== 'object' || input.secretValuesIncluded !== false) return { ok: false, reason: 'secret_values_not_allowed' }
  if (
    !safeIdentifier(input.backupId) ||
    !safeIdentifier(input.workspaceId) ||
    !safeCount(input.createdAtMs, Number.MAX_SAFE_INTEGER) ||
    !safeSha256(input.archiveSha256) ||
    !safeIdentifier(input.auditEventId) ||
    !safeCount(input.secretReferenceCount, BACKUP_MAX_SECRET_REFERENCES) ||
    !Array.isArray(input.entries) ||
    input.entries.length > BACKUP_MAX_ENTRIES
  ) return { ok: false, reason: 'input_invalid' }

  const resourceCounts = Object.fromEntries(BACKUP_RESOURCES.map(resource => [resource, 0])) as Record<BackupResource, number>
  const identities = new Set<string>()
  for (const entry of input.entries) {
    if (!entry || !isBackupResource(entry.resource) || !safeIdentifier(entry.recordId) || !safeIdentifier(entry.workspaceId) || !safeSha256(entry.contentSha256)) return { ok: false, reason: 'input_invalid' }
    if (entry.workspaceId !== input.workspaceId) return { ok: false, reason: 'scope_mismatch' }
    const identity = `${entry.resource}:${entry.recordId}`
    if (identities.has(identity)) return { ok: false, reason: 'duplicate_entry' }
    identities.add(identity)
    resourceCounts[entry.resource] += 1
  }

  return {
    ok: true,
    manifest: Object.freeze({
      version: 'v1',
      backupId: input.backupId,
      workspaceId: input.workspaceId,
      createdAtMs: input.createdAtMs,
      entryCount: input.entries.length,
      resources: Object.freeze(resourceCounts),
      archiveSha256: input.archiveSha256,
      auditEventId: input.auditEventId,
      secretStorage: 'external_only',
      secretReferenceCount: input.secretReferenceCount,
      secretValuesIncluded: false,
    }),
  }
}

/** Allows restore only after scope, hash, audit, migration and readiness checks. */
export function evaluateBackupRestore(input: Readonly<{
  manifest: BackupManifest
  requestedWorkspaceId: string
  actualArchiveSha256: string
  environment: 'disposable' | 'staging' | 'production'
  migrationsApplied: boolean
  readinessOk: boolean
  auditEventId: string
  secretValuesAvailable: boolean
}>): BackupRestoreResult {
  if (!input || typeof input !== 'object') return { ok: false, reason: 'input_invalid' }
  if (!isManifest(input.manifest)) return { ok: false, reason: 'manifest_invalid' }
  if (input.environment !== 'disposable' && input.environment !== 'staging') return { ok: false, reason: 'environment_not_allowed' }
  if (!safeIdentifier(input.requestedWorkspaceId) || !safeSha256(input.actualArchiveSha256) || !safeIdentifier(input.auditEventId)) return { ok: false, reason: 'input_invalid' }
  if (input.secretValuesAvailable === true) return { ok: false, reason: 'secret_values_not_allowed' }
  if (input.manifest.workspaceId !== input.requestedWorkspaceId) return { ok: false, reason: 'scope_mismatch' }
  if (input.actualArchiveSha256 !== input.manifest.archiveSha256) return { ok: false, reason: 'hash_mismatch' }
  if (input.auditEventId !== input.manifest.auditEventId) return { ok: false, reason: 'audit_mismatch' }
  if (input.migrationsApplied !== true) return { ok: false, reason: 'migration_required' }
  if (input.readinessOk !== true) return { ok: false, reason: 'readiness_required' }

  return {
    ok: true,
    decision: {
      action: 'restore',
      environment: input.environment,
      workspaceId: input.manifest.workspaceId,
      entryCount: input.manifest.entryCount,
      archiveSha256: input.manifest.archiveSha256,
      auditEventId: input.manifest.auditEventId,
      secretStorage: 'external_only',
    },
  }
}
