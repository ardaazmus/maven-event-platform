import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createBadgePdfRenderPlan } from '../src/lib/badge-pdf-render-port.ts'

const request = {
  workspaceId: 'workspace-1',
  formId: 'form-1',
  templateVersionId: 'template-v1',
  snapshotId: 'snapshot-1',
  outputId: 'output-1',
  faceMode: 'SINGLE_FACE',
  pageCount: 1,
}

assert.deepEqual(createBadgePdfRenderPlan({ rendererConfigured: false, request }), {
  ok: false,
  code: 'RENDERER_NOT_CONFIGURED',
})

const single = createBadgePdfRenderPlan({ rendererConfigured: true, request })
assert.equal(single.ok, true)
assert.deepEqual(single.plan, {
  kind: 'BADGE_PDF_RENDER',
  workspaceId: 'workspace-1',
  formId: 'form-1',
  templateVersionId: 'template-v1',
  snapshotId: 'snapshot-1',
  outputId: 'output-1',
  faceMode: 'SINGLE_FACE',
  pageCount: 1,
  mimeType: 'application/pdf',
  visibility: 'private',
  delivery: 'artifact-store-only',
})

assert.deepEqual(createBadgePdfRenderPlan({ rendererConfigured: true, request: { ...request, faceMode: 'DUAL_FACE' } }), {
  ok: false,
  code: 'FACE_PAGE_MISMATCH',
})
assert.deepEqual(createBadgePdfRenderPlan({ rendererConfigured: true, request: { ...request, pageCount: 2 } }), {
  ok: false,
  code: 'FACE_PAGE_MISMATCH',
})
assert.deepEqual(createBadgePdfRenderPlan({ rendererConfigured: true, request: { ...request, outputId: 'Ada Lovelace' } }), {
  ok: false,
  code: 'IDENTIFIER_INVALID',
})

const source = await readFile(new URL('../src/lib/badge-pdf-render-port.ts', import.meta.url), 'utf8')
assert.equal(/provider|secret|token|qr payload|email|matbaa/iu.test(source), false)

console.log('badge-pdf-render-port: all assertions passed')
