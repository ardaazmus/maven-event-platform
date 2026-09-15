import assert from 'node:assert/strict'
import {
  createBadgeTemplateStorageKey,
  validateBadgeTemplateUpload,
} from '../src/lib/badge-template-contract.ts'

const pdf = text => new TextEncoder().encode(`%PDF-1.7\n${text}\n%%EOF`)
const basePdf = pdf('static background')
const base = {
  workspaceId: 'workspace-1',
  formId: 'form-1',
  originalName: 'yaka-karti.pdf',
  mime: 'application/pdf',
  size: basePdf.byteLength,
  bytes: basePdf,
  pageCount: 1,
  widthPt: 288,
  heightPt: 432,
  visibility: 'private',
}
const withBytes = bytes => ({ ...base, bytes, size: bytes.byteLength })

assert.deepEqual(validateBadgeTemplateUpload(base), { ok: true, code: 'OK' })
assert.deepEqual(validateBadgeTemplateUpload({ ...base, visibility: 'published' }), { ok: false, code: 'PRIVATE_ONLY' })
assert.deepEqual(validateBadgeTemplateUpload({ ...base, mime: 'image/png' }), { ok: false, code: 'PDF_REQUIRED' })
assert.deepEqual(validateBadgeTemplateUpload(withBytes(new TextEncoder().encode('not a pdf'))), { ok: false, code: 'PDF_SIGNATURE_INVALID' })
assert.deepEqual(validateBadgeTemplateUpload(withBytes(pdf('/OpenAction /JavaScript'))), { ok: false, code: 'ACTIVE_CONTENT_REJECTED' })
assert.deepEqual(validateBadgeTemplateUpload({ ...base, pageCount: 3 }), { ok: false, code: 'PAGE_COUNT_INVALID' })
assert.deepEqual(validateBadgeTemplateUpload({ ...base, widthPt: 0 }), { ok: false, code: 'DIMENSION_INVALID' })
assert.equal(
  createBadgeTemplateStorageKey({ workspaceId: 'workspace-1', formId: 'form-1', templateId: 'template-1', versionId: 'version-1' }),
  'private/workspaces/workspace-1/forms/form-1/badge-templates/template-1/version-1/source.pdf',
)
assert.throws(
  () => createBadgeTemplateStorageKey({ workspaceId: 'workspace/1', formId: 'form-1', templateId: 'template-1', versionId: 'version-1' }),
  /geçersiz/,
)
