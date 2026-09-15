// @ts-expect-error Node strip-types tests require explicit TypeScript extensions.
import { createBadgeRenderInputDescriptor, type BadgeRenderInputDescriptor } from './badge-render-input-contract.ts'
// @ts-expect-error Node strip-types tests require explicit TypeScript extensions.
import { bindBadgeTemplateToGenerationJob, type BadgeTemplateBinding } from './badge-template-binding-contract.ts'
import type { BadgeGenerationJob } from './badge-generation-job-contract.ts'
import type { BadgeQrCredential } from './badge-qr-security-contract.ts'
import type { BadgeSubmissionSnapshot } from './badge-snapshot-contract.ts'
// @ts-expect-error Node strip-types tests require explicit TypeScript extensions.
import { renderBadgePdfDocument, type BadgePdfFaceInput } from './badge-pdf-document-renderer.ts'
// @ts-expect-error Node strip-types tests require explicit TypeScript extensions.
import { storeBadgePdfArtifact } from './badge-artifact-storage.ts'
import type { BadgeArtifactDescriptor } from './badge-artifact-storage-contract'

type BadgeTemplateForExecution = Readonly<{
  templateId: string
  versionId: string
  workspaceId: string
  formId: string
  pageCount: 1 | 2
  visibility: 'private' | 'published'
  validationStatus: 'VALIDATED' | 'REJECTED'
}>

type BadgeFacePlan = Omit<BadgePdfFaceInput, 'values' | 'qrPayload'>

export type BadgeGenerationExecutionInput = Readonly<{
  job: BadgeGenerationJob
  template: BadgeTemplateForExecution
  snapshot: BadgeSubmissionSnapshot
  badgeInstanceId: string
  artifactId: string
  outputId: string
  backgroundPdfBytes: Uint8Array
  faces: ReadonlyArray<BadgeFacePlan>
  qrCredential?: BadgeQrCredential | null
  rootDir?: string
  filename?: string
}>

export type BadgeGenerationExecutionErrorCode =
  | 'TEMPLATE_BINDING_FAILED'
  | 'SNAPSHOT_SCOPE_INVALID'
  | 'RENDER_INPUT_FAILED'
  | 'RENDER_FAILED'
  | 'STORAGE_FAILED'

export type BadgeGenerationExecutionOutput = Readonly<{
  artifact: BadgeArtifactDescriptor
  binding: BadgeTemplateBinding
  renderInput: BadgeRenderInputDescriptor
  scanRequired: true
  state: 'QUARANTINED'
  downloadable: false
}>

function sameScope(left: Readonly<{ workspaceId: string; formId: string }>, right: Readonly<{ workspaceId: string; formId: string }>) {
  return left.workspaceId === right.workspaceId && left.formId === right.formId
}

export async function executeBadgeGeneration(
  input: BadgeGenerationExecutionInput,
): Promise<{ ok: true; output: BadgeGenerationExecutionOutput } | { ok: false; stage: BadgeGenerationExecutionErrorCode; code: string }> {
  const binding = bindBadgeTemplateToGenerationJob({ job: input.job, template: input.template })
  if (!binding.ok) return { ok: false, stage: 'TEMPLATE_BINDING_FAILED', code: binding.code }
  if (!sameScope(input.job, input.snapshot)) return { ok: false, stage: 'SNAPSHOT_SCOPE_INVALID', code: 'SCOPE_MISMATCH' }

  const renderInput = createBadgeRenderInputDescriptor({
    job: input.job,
    snapshot: input.snapshot,
    badgeInstanceId: input.badgeInstanceId,
    qrCredential: input.qrCredential,
  })
  if (!renderInput.ok) return { ok: false, stage: 'RENDER_INPUT_FAILED', code: renderInput.code }

  const qrPayload = input.qrCredential && renderInput.descriptor.qrStatus === 'VALID' ? input.qrCredential.payload : undefined
  const faces = input.faces.map(face => ({
    ...face,
    values: input.snapshot.values,
    ...(face.qrPlacement && qrPayload ? { qrPayload } : {}),
  }))
  const rendered = await renderBadgePdfDocument({
    backgroundPdfBytes: input.backgroundPdfBytes,
    faceMode: input.job.faceMode,
    faces,
  })
  if (!rendered.ok) return { ok: false, stage: 'RENDER_FAILED', code: rendered.code }

  const stored = await storeBadgePdfArtifact({
    scope: {
      workspaceId: input.job.workspaceId,
      formId: input.job.formId,
      artifactId: input.artifactId,
      outputId: input.outputId,
    },
    bytes: rendered.output.bytes,
    rootDir: input.rootDir,
    filename: input.filename,
    metadata: {
      submissionId: input.snapshot.submissionId,
      jobId: input.job.jobId,
      templateVersionId: input.job.templateVersionId,
      printProfileId: input.job.printProfileId,
      faceMode: input.job.faceMode,
    },
  })
  if (!stored.ok) return { ok: false, stage: 'STORAGE_FAILED', code: stored.code }

  return {
    ok: true,
    output: {
      artifact: stored.descriptor,
      binding: binding.binding,
      renderInput: renderInput.descriptor,
      scanRequired: true,
      state: 'QUARANTINED',
      downloadable: false,
    },
  }
}
