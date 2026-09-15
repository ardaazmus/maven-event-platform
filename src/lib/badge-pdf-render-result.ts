import type { BadgePdfRenderFaceMode, BadgePdfRenderPlan } from './badge-pdf-render-port'

export type BadgePdfRenderAdapterResult = Readonly<{
  status: 'READY'
  artifactId: string
  workspaceId: string
  formId: string
  templateVersionId: string
  snapshotId: string
  outputId: string
  faceMode: BadgePdfRenderFaceMode
  pageCount: 1 | 2
  visibility: 'private'
  delivery: 'artifact-store-only'
}> | Readonly<{
  status: 'FAILED'
  errorCode: string
}>

export type BadgePdfArtifactDescriptor = Readonly<{
  artifactId: string
  workspaceId: string
  formId: string
  templateVersionId: string
  snapshotId: string
  outputId: string
  faceMode: BadgePdfRenderFaceMode
  pageCount: 1 | 2
  mimeType: 'application/pdf'
  visibility: 'private'
  delivery: 'artifact-store-only'
}>

export type BadgePdfRenderResultValidationCode =
  | 'OK'
  | 'RESULT_INVALID'
  | 'SCOPE_MISMATCH'
  | 'OUTPUT_MISMATCH'
  | 'FACE_PAGE_MISMATCH'
  | 'ARTIFACT_REQUIRED'
  | 'PRIVATE_ARTIFACT_REQUIRED'
  | 'RENDER_FAILED'

function isOpaqueIdentifier(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/u.test(value)
}

function isSafeErrorCode(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Z0-9_:-]{1,64}$/u.test(value)
}

function expectedPageCount(faceMode: BadgePdfRenderFaceMode) {
  return faceMode === 'SINGLE_FACE' ? 1 : 2
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function validateBadgePdfRenderResult(input: Readonly<{
  plan: BadgePdfRenderPlan
  result: unknown
}>): { ok: true; artifact: BadgePdfArtifactDescriptor } | { ok: false; code: BadgePdfRenderResultValidationCode; errorCode?: string } {
  if (!isRecord(input.result) || typeof input.result.status !== 'string') return { ok: false, code: 'RESULT_INVALID' }

  if (input.result.status === 'FAILED') {
    if ('artifactId' in input.result || 'workspaceId' in input.result || 'formId' in input.result || 'outputId' in input.result) {
      return { ok: false, code: 'RESULT_INVALID' }
    }
    if (!isSafeErrorCode(input.result.errorCode)) return { ok: false, code: 'RESULT_INVALID' }
    return { ok: false, code: 'RENDER_FAILED', errorCode: input.result.errorCode }
  }

  if (input.result.status !== 'READY') return { ok: false, code: 'RESULT_INVALID' }
  if (!isOpaqueIdentifier(input.result.artifactId)) return { ok: false, code: 'ARTIFACT_REQUIRED' }
  if (input.result.visibility !== 'private' || input.result.delivery !== 'artifact-store-only') {
    return { ok: false, code: 'PRIVATE_ARTIFACT_REQUIRED' }
  }
  if (input.result.workspaceId !== input.plan.workspaceId || input.result.formId !== input.plan.formId || input.result.templateVersionId !== input.plan.templateVersionId || input.result.snapshotId !== input.plan.snapshotId) {
    return { ok: false, code: 'SCOPE_MISMATCH' }
  }
  if (input.result.outputId !== input.plan.outputId) return { ok: false, code: 'OUTPUT_MISMATCH' }
  if (input.result.faceMode !== input.plan.faceMode || input.result.pageCount !== expectedPageCount(input.plan.faceMode)) {
    return { ok: false, code: 'FACE_PAGE_MISMATCH' }
  }

  return {
    ok: true,
    artifact: {
      artifactId: input.result.artifactId,
      workspaceId: input.plan.workspaceId,
      formId: input.plan.formId,
      templateVersionId: input.plan.templateVersionId,
      snapshotId: input.plan.snapshotId,
      outputId: input.plan.outputId,
      faceMode: input.plan.faceMode,
      pageCount: input.plan.pageCount,
      mimeType: 'application/pdf',
      visibility: 'private',
      delivery: 'artifact-store-only',
    },
  }
}
