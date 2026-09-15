// @ts-expect-error The Node strip-types contract tests execute the sibling TypeScript module directly.
import { createBadgeBatchJob, type BadgeBatchJob, type BadgeBatchValidationCode } from './badge-batch-contract.ts'
import type { BadgeEntry } from './badge-entry-contract'

export type BadgeGenerationFaceMode = 'SINGLE_FACE' | 'DUAL_FACE'

export type BadgeGenerationJob = Readonly<{
  jobId: string
  workspaceId: string
  formId: string
  templateVersionId: string
  snapshotHash: string
  printProfileId: string
  surface: BadgeEntry['surface']
  selectionMode: BadgeEntry['selectionMode']
  faceMode: BadgeGenerationFaceMode
  batchJob: BadgeBatchJob
  rendererRequired: true
  outputExportEnabled: false
}>

export type BadgeGenerationJobValidationCode = BadgeBatchValidationCode | 'SCOPE_INVALID' | 'FACE_MODE_INVALID'

function isSafeIdentifier(value: string) {
  return Boolean(value.trim()) && !/[\\/:\s]/u.test(value)
}

export function createBadgeGenerationJob(input: Readonly<{
  entry: BadgeEntry
  jobId: string
  templateVersionId: string
  snapshotHash: string
  printProfileId: string
  faceMode: BadgeGenerationFaceMode
}>): { ok: true; job: BadgeGenerationJob } | { ok: false; code: BadgeGenerationJobValidationCode } {
  if (!isSafeIdentifier(input.entry.workspaceId) || !isSafeIdentifier(input.entry.formId)) return { ok: false, code: 'SCOPE_INVALID' }
  if (input.faceMode !== 'SINGLE_FACE' && input.faceMode !== 'DUAL_FACE') return { ok: false, code: 'FACE_MODE_INVALID' }

  const batch = createBadgeBatchJob({
    jobId: input.jobId,
    workspaceId: input.entry.workspaceId,
    formId: input.entry.formId,
    templateVersionId: input.templateVersionId,
    snapshotHash: input.snapshotHash,
    printProfileId: input.printProfileId,
    selectionMode: input.entry.selectionMode === 'ALL' ? 'ALL' : 'SELECTED',
    eligibleSubmissionIds: input.entry.submissionIds,
  })
  if (!batch.ok) return batch

  return {
    ok: true,
    job: {
      jobId: batch.job.jobId,
      workspaceId: batch.job.workspaceId,
      formId: batch.job.formId,
      templateVersionId: batch.job.templateVersionId,
      snapshotHash: batch.job.snapshotHash,
      printProfileId: batch.job.printProfileId,
      surface: input.entry.surface,
      selectionMode: input.entry.selectionMode,
      faceMode: input.faceMode,
      batchJob: batch.job,
      rendererRequired: true,
      outputExportEnabled: false,
    },
  }
}
