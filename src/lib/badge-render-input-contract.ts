// @ts-expect-error The Node strip-types contract tests execute the sibling TypeScript module directly.
import { validateBadgeQrCredential, type BadgeQrCredential, type BadgeQrSecurityValidationCode } from './badge-qr-security-contract.ts'
import type { BadgeGenerationJob } from './badge-generation-job-contract'
import type { BadgeSubmissionSnapshot } from './badge-snapshot-contract'

export type BadgeRenderInputDescriptor = Readonly<{
  jobId: string
  workspaceId: string
  formId: string
  templateVersionId: string
  snapshotId: string
  submissionId: string
  printProfileId: string
  badgeInstanceId: string
  qrMode: BadgeQrCredential['mode']
  qrStatus: 'DISABLED' | 'VALID' | 'WARN_REQUIRES_CONFIRMATION'
  rendererRequired: true
}>

export type BadgeRenderInputValidationCode =
  | 'IDENTIFIER_INVALID'
  | 'SCOPE_MISMATCH'
  | 'QR_INVALID'
  | BadgeQrSecurityValidationCode

function isSafeIdentifier(value: string) {
  return Boolean(value.trim()) && !/[\\/:\s]/u.test(value)
}

export function createBadgeRenderInputDescriptor(input: Readonly<{
  job: Pick<BadgeGenerationJob, 'jobId' | 'workspaceId' | 'formId' | 'templateVersionId' | 'printProfileId'>
  snapshot: Pick<BadgeSubmissionSnapshot, 'snapshotId' | 'workspaceId' | 'formId' | 'submissionId'>
  badgeInstanceId: string
  qrCredential?: BadgeQrCredential | null
}>): { ok: true; descriptor: BadgeRenderInputDescriptor } | { ok: false; code: BadgeRenderInputValidationCode } {
  const ids = [input.job.jobId, input.job.workspaceId, input.job.formId, input.job.templateVersionId, input.job.printProfileId, input.snapshot.snapshotId, input.snapshot.workspaceId, input.snapshot.formId, input.snapshot.submissionId, input.badgeInstanceId]
  if (ids.some(id => !isSafeIdentifier(id))) return { ok: false, code: 'IDENTIFIER_INVALID' }
  if (input.snapshot.workspaceId !== input.job.workspaceId || input.snapshot.formId !== input.job.formId) return { ok: false, code: 'SCOPE_MISMATCH' }

  if (!input.qrCredential) {
    return {
      ok: true,
      descriptor: {
        jobId: input.job.jobId,
        workspaceId: input.job.workspaceId,
        formId: input.job.formId,
        templateVersionId: input.job.templateVersionId,
        snapshotId: input.snapshot.snapshotId,
        submissionId: input.snapshot.submissionId,
        printProfileId: input.job.printProfileId,
        badgeInstanceId: input.badgeInstanceId,
        qrMode: 'NONE',
        qrStatus: 'DISABLED',
        rendererRequired: true,
      },
    }
  }

  const qr = validateBadgeQrCredential({
    credential: input.qrCredential,
    expectedScope: { workspaceId: input.job.workspaceId, formId: input.job.formId, badgeInstanceId: input.badgeInstanceId },
  })
  if (!qr.ok) return { ok: false, code: qr.code }

  return {
    ok: true,
    descriptor: {
      jobId: input.job.jobId,
      workspaceId: input.job.workspaceId,
      formId: input.job.formId,
      templateVersionId: input.job.templateVersionId,
      snapshotId: input.snapshot.snapshotId,
      submissionId: input.snapshot.submissionId,
      printProfileId: input.job.printProfileId,
      badgeInstanceId: input.badgeInstanceId,
      qrMode: qr.mode,
      qrStatus: qr.status === 'VALID' ? 'VALID' : 'WARN_REQUIRES_CONFIRMATION',
      rendererRequired: true,
    },
  }
}
