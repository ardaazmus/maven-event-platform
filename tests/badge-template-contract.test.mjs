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

// PDF yolu korunur (başarı artık format taşır)
assert.deepEqual(validateBadgeTemplateUpload(base), { ok: true, code: 'OK', format: 'pdf' })
assert.deepEqual(validateBadgeTemplateUpload({ ...base, visibility: 'published' }), { ok: false, code: 'PRIVATE_ONLY' })
assert.deepEqual(validateBadgeTemplateUpload(withBytes(new TextEncoder().encode('not a pdf'))), { ok: false, code: 'SIGNATURE_INVALID' })
assert.deepEqual(validateBadgeTemplateUpload(withBytes(pdf('/OpenAction /JavaScript'))), { ok: false, code: 'ACTIVE_CONTENT_REJECTED' })
assert.deepEqual(validateBadgeTemplateUpload({ ...base, pageCount: 3 }), { ok: false, code: 'PAGE_COUNT_INVALID' })
assert.deepEqual(validateBadgeTemplateUpload({ ...base, widthPt: 0 }), { ok: false, code: 'DIMENSION_INVALID' })

// Desteklenmeyen format + üçlü uyumsuzluk
assert.deepEqual(validateBadgeTemplateUpload({ ...base, mime: 'image/gif', originalName: 'a.gif' }), { ok: false, code: 'FORMAT_REQUIRED' })
assert.deepEqual(validateBadgeTemplateUpload({ ...base, mime: 'image/png' }), { ok: false, code: 'FORMAT_MISMATCH' })
assert.deepEqual(validateBadgeTemplateUpload({ ...base, originalName: 'yaka-karti.png' }), { ok: false, code: 'FORMAT_MISMATCH' })

// Raster fixtures: gerçek magic imzaları
const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01, 0x02, 0x03])
const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46])
const webpBytes = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x10, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50])
const raster = (name, mime, bytes) => ({ ...base, originalName: name, mime, bytes, size: bytes.byteLength, pageCount: 1, widthPt: 1748, heightPt: 1240 })

assert.deepEqual(validateBadgeTemplateUpload(raster('sablon.png', 'image/png', pngBytes)), { ok: true, code: 'OK', format: 'png' })
assert.deepEqual(validateBadgeTemplateUpload(raster('sablon.jpg', 'image/jpeg', jpegBytes)), { ok: true, code: 'OK', format: 'jpeg' })
assert.deepEqual(validateBadgeTemplateUpload(raster('sablon.jpeg', 'image/jpeg', jpegBytes)), { ok: true, code: 'OK', format: 'jpeg' })
assert.deepEqual(validateBadgeTemplateUpload(raster('sablon.webp', 'image/webp', webpBytes)), { ok: true, code: 'OK', format: 'webp' })

// Raster guard'ları: sahte magic, sayfa, piksel tavanı
assert.deepEqual(
  validateBadgeTemplateUpload(raster('sahte.png', 'image/png', new TextEncoder().encode('fake-png-bytes!'))),
  { ok: false, code: 'SIGNATURE_INVALID' },
)
assert.deepEqual(
  validateBadgeTemplateUpload({ ...raster('sablon.png', 'image/png', pngBytes), pageCount: 2 }),
  { ok: false, code: 'PAGE_COUNT_INVALID' },
)
assert.deepEqual(
  validateBadgeTemplateUpload({ ...raster('dev.png', 'image/png', pngBytes), widthPt: 9000, heightPt: 9000 }),
  { ok: false, code: 'PIXEL_COUNT_INVALID' },
)
assert.deepEqual(
  validateBadgeTemplateUpload(raster('sablon.png', 'image/jpeg', pngBytes)),
  { ok: false, code: 'FORMAT_MISMATCH' },
)

// Storage key: varsayılan pdf korunur, raster uzantılı
assert.equal(
  createBadgeTemplateStorageKey({ workspaceId: 'workspace-1', formId: 'form-1', templateId: 'template-1', versionId: 'version-1' }),
  'private/workspaces/workspace-1/forms/form-1/badge-templates/template-1/version-1/source.pdf',
)
assert.equal(
  createBadgeTemplateStorageKey({ workspaceId: 'workspace-1', formId: 'form-1', templateId: 'template-1', versionId: 'version-1' }, 'png'),
  'private/workspaces/workspace-1/forms/form-1/badge-templates/template-1/version-1/source.png',
)
assert.equal(
  createBadgeTemplateStorageKey({ workspaceId: 'workspace-1', formId: 'form-1', templateId: 'template-1', versionId: 'version-1' }, 'jpeg'),
  'private/workspaces/workspace-1/forms/form-1/badge-templates/template-1/version-1/source.jpg',
)
assert.equal(
  createBadgeTemplateStorageKey({ workspaceId: 'workspace-1', formId: 'form-1', templateId: 'template-1', versionId: 'version-1' }, 'webp'),
  'private/workspaces/workspace-1/forms/form-1/badge-templates/template-1/version-1/source.webp',
)
assert.throws(
  () => createBadgeTemplateStorageKey({ workspaceId: 'workspace/1', formId: 'form-1', templateId: 'template-1', versionId: 'version-1' }),
  /geçersiz/,
)

console.log('badge-template-contract.test: PASS (pdf + png + jpeg + webp)')
