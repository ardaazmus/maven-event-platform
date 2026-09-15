export type BadgePdfRenderFaceMode = 'SINGLE_FACE' | 'DUAL_FACE'

export type BadgePdfRenderRequest = Readonly<{
  workspaceId: string
  formId: string
  templateVersionId: string
  snapshotId: string
  outputId: string
  faceMode: BadgePdfRenderFaceMode
  pageCount: 1 | 2
}>

export type BadgePdfRenderPlan = Readonly<{
  kind: 'BADGE_PDF_RENDER'
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

export type BadgePdfRenderValidationCode =
  | 'OK'
  | 'RENDERER_NOT_CONFIGURED'
  | 'IDENTIFIER_INVALID'
  | 'FACE_PAGE_MISMATCH'

function isOpaqueIdentifier(value: string) {
  return /^[A-Za-z0-9_-]{1,128}$/u.test(value)
}

function expectedPageCount(faceMode: BadgePdfRenderFaceMode) {
  return faceMode === 'SINGLE_FACE' ? 1 : 2
}

export function createBadgePdfRenderPlan(input: Readonly<{
  rendererConfigured: boolean
  request: BadgePdfRenderRequest
}>): { ok: true; plan: BadgePdfRenderPlan } | { ok: false; code: BadgePdfRenderValidationCode } {
  const { request } = input
  if (![request.workspaceId, request.formId, request.templateVersionId, request.snapshotId, request.outputId].every(isOpaqueIdentifier)) {
    return { ok: false, code: 'IDENTIFIER_INVALID' }
  }
  if (request.faceMode !== 'SINGLE_FACE' && request.faceMode !== 'DUAL_FACE') {
    return { ok: false, code: 'FACE_PAGE_MISMATCH' }
  }
  if (request.pageCount !== expectedPageCount(request.faceMode)) return { ok: false, code: 'FACE_PAGE_MISMATCH' }
  if (!input.rendererConfigured) return { ok: false, code: 'RENDERER_NOT_CONFIGURED' }

  return {
    ok: true,
    plan: {
      kind: 'BADGE_PDF_RENDER',
      workspaceId: request.workspaceId,
      formId: request.formId,
      templateVersionId: request.templateVersionId,
      snapshotId: request.snapshotId,
      outputId: request.outputId,
      faceMode: request.faceMode,
      pageCount: request.pageCount,
      mimeType: 'application/pdf',
      visibility: 'private',
      delivery: 'artifact-store-only',
    },
  }
}
