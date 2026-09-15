export const BADGE_BATCH_MAX_RECORDS = 500
export const BADGE_BATCH_MAX_RETRIES = 3
export const BADGE_BATCH_LEASE_SECONDS = 120

export type BadgeBatchSelectionMode = 'SELECTED' | 'ALL'
export type BadgeBatchRecordStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED'

export type BadgeBatchRecord = Readonly<{
  submissionId: string
  status: BadgeBatchRecordStatus
  attempt: number
  errorCode?: string
}>

export type BadgeBatchJob = Readonly<{
  jobId: string
  workspaceId: string
  formId: string
  templateVersionId: string
  snapshotHash: string
  printProfileId: string
  selectionMode: BadgeBatchSelectionMode
  idempotencyKey: string
  maxAttempts: 3
  leaseSeconds: 120
  records: ReadonlyArray<BadgeBatchRecord>
}>

export type BadgeBatchValidationCode =
  | 'OK'
  | 'IDENTIFIER_INVALID'
  | 'SELECTION_EMPTY'
  | 'SELECTION_TOO_LARGE'
  | 'SELECTION_DUPLICATE'
  | 'SELECTION_MODE_INVALID'

function isSafeIdentifier(value: string) {
  return Boolean(value.trim()) && !/[\\/:\s]/u.test(value)
}

function normalizeSubmissionIds(ids: ReadonlyArray<string>) {
  const normalized = ids.map(id => id.trim())
  if (normalized.some(id => !isSafeIdentifier(id))) return { ok: false as const, code: 'IDENTIFIER_INVALID' as const }
  const unique = [...new Set(normalized)]
  if (unique.length !== normalized.length) return { ok: false as const, code: 'SELECTION_DUPLICATE' as const }
  return { ok: true as const, ids: unique }
}

export function createBadgeBatchJob(input: Readonly<{
  jobId: string
  workspaceId: string
  formId: string
  templateVersionId: string
  snapshotHash: string
  printProfileId: string
  selectionMode: BadgeBatchSelectionMode
  eligibleSubmissionIds: ReadonlyArray<string>
  maxRecords?: number
}>): { ok: true; job: BadgeBatchJob } | { ok: false; code: BadgeBatchValidationCode } {
  const scopeIds = [input.jobId, input.workspaceId, input.formId, input.templateVersionId, input.snapshotHash, input.printProfileId]
  if (scopeIds.some(id => !isSafeIdentifier(id))) return { ok: false, code: 'IDENTIFIER_INVALID' }
  if (input.selectionMode !== 'SELECTED' && input.selectionMode !== 'ALL') return { ok: false, code: 'SELECTION_MODE_INVALID' }

  const maxRecords = input.maxRecords ?? BADGE_BATCH_MAX_RECORDS
  if (!Number.isSafeInteger(maxRecords) || maxRecords <= 0 || maxRecords > BADGE_BATCH_MAX_RECORDS) return { ok: false, code: 'SELECTION_TOO_LARGE' }
  const normalized = normalizeSubmissionIds(input.eligibleSubmissionIds)
  if (!normalized.ok) return normalized
  if (!normalized.ids.length) return { ok: false, code: 'SELECTION_EMPTY' }
  if (normalized.ids.length > maxRecords) return { ok: false, code: 'SELECTION_TOO_LARGE' }

  const records = normalized.ids.map(submissionId => ({ submissionId, status: 'PENDING' as const, attempt: 0 }))
  return {
    ok: true,
    job: {
      jobId: input.jobId,
      workspaceId: input.workspaceId,
      formId: input.formId,
      templateVersionId: input.templateVersionId,
      snapshotHash: input.snapshotHash,
      printProfileId: input.printProfileId,
      selectionMode: input.selectionMode,
      idempotencyKey: [input.jobId, input.templateVersionId, input.snapshotHash, input.printProfileId].join(':'),
      maxAttempts: BADGE_BATCH_MAX_RETRIES,
      leaseSeconds: BADGE_BATCH_LEASE_SECONDS,
      records,
    },
  }
}

export function shouldRetryBadgeRecord(record: BadgeBatchRecord) {
  return record.status === 'FAILED' && record.attempt < BADGE_BATCH_MAX_RETRIES
}
