import assert from 'node:assert/strict'
import { createBadgePdfRenderPlan } from '../src/lib/badge-pdf-render-port.ts'
import { validateBadgePdfRenderResult } from '../src/lib/badge-pdf-render-result.ts'

const planResult = createBadgePdfRenderPlan({
  rendererConfigured: true,
  request: {
    workspaceId: 'workspace-1',
    formId: 'form-1',
    templateVersionId: 'template-v1',
    snapshotId: 'snapshot-1',
    outputId: 'output-1',
    faceMode: 'DUAL_FACE',
    pageCount: 2,
  },
})
assert.equal(planResult.ok, true)

const ready = validateBadgePdfRenderResult({
  plan: planResult.plan,
  result: {
    status: 'READY',
    artifactId: 'artifact-1',
    workspaceId: 'workspace-1',
    formId: 'form-1',
    templateVersionId: 'template-v1',
    snapshotId: 'snapshot-1',
    outputId: 'output-1',
    faceMode: 'DUAL_FACE',
    pageCount: 2,
    visibility: 'private',
    delivery: 'artifact-store-only',
    participantName: 'not-forwarded',
  },
})
assert.deepEqual(ready, {
  ok: true,
  artifact: {
    artifactId: 'artifact-1',
    workspaceId: 'workspace-1',
    formId: 'form-1',
    templateVersionId: 'template-v1',
    snapshotId: 'snapshot-1',
    outputId: 'output-1',
    faceMode: 'DUAL_FACE',
    pageCount: 2,
    mimeType: 'application/pdf',
    visibility: 'private',
    delivery: 'artifact-store-only',
  },
})

assert.deepEqual(validateBadgePdfRenderResult({
  plan: planResult.plan,
  result: { status: 'FAILED', errorCode: 'TEMPLATE_NOT_READY' },
}), { ok: false, code: 'RENDER_FAILED', errorCode: 'TEMPLATE_NOT_READY' })
assert.deepEqual(validateBadgePdfRenderResult({
  plan: planResult.plan,
  result: { status: 'FAILED', errorCode: 'TEMPLATE_NOT_READY', artifactId: 'artifact-1' },
}), { ok: false, code: 'RESULT_INVALID' })
assert.deepEqual(validateBadgePdfRenderResult({
  plan: planResult.plan,
  result: {
    status: 'READY', artifactId: 'artifact-1', workspaceId: 'other-workspace', formId: 'form-1', templateVersionId: 'template-v1', snapshotId: 'snapshot-1', outputId: 'output-1', faceMode: 'DUAL_FACE', pageCount: 2, visibility: 'private', delivery: 'artifact-store-only',
  },
}), { ok: false, code: 'SCOPE_MISMATCH' })
assert.deepEqual(validateBadgePdfRenderResult({
  plan: planResult.plan,
  result: {
    status: 'READY', artifactId: 'artifact-1', workspaceId: 'workspace-1', formId: 'form-1', templateVersionId: 'template-v1', snapshotId: 'snapshot-1', outputId: 'output-1', faceMode: 'DUAL_FACE', pageCount: 1, visibility: 'private', delivery: 'artifact-store-only',
  },
}), { ok: false, code: 'FACE_PAGE_MISMATCH' })
assert.deepEqual(validateBadgePdfRenderResult({
  plan: planResult.plan,
  result: {
    status: 'READY', artifactId: 'artifact-1', workspaceId: 'workspace-1', formId: 'form-1', templateVersionId: 'template-v1', snapshotId: 'snapshot-1', outputId: 'output-1', faceMode: 'DUAL_FACE', pageCount: 2, visibility: 'public', delivery: 'artifact-store-only',
  },
}), { ok: false, code: 'PRIVATE_ARTIFACT_REQUIRED' })

console.log('badge-pdf-render-result: all assertions passed')
