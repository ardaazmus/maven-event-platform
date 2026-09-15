import assert from 'node:assert/strict'
import { evaluateUploadAbuse } from '../src/lib/upload-abuse-matrix.ts'
import { createXlsx } from '../src/lib/xlsx-export.ts'

const pdf = Buffer.from('%PDF-1.7\n')
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const base = { filename: 'document.pdf', mime: 'application/pdf', bytes: pdf, size: pdf.byteLength }

const valid = evaluateUploadAbuse(base)
assert.equal(valid.allowed, true)
if (valid.allowed) {
  assert.deepEqual({ kind: valid.kind, size: valid.size }, { kind: 'pdf', size: pdf.byteLength })
  assert.match(valid.sha256, /^[a-f0-9]{64}$/)
}

const pathTraversal = evaluateUploadAbuse({ ...base, filename: '../document.pdf' })
assert.deepEqual(pathTraversal, { allowed: false, category: 'path_traversal', code: 'filename_invalid' })
assert.deepEqual(evaluateUploadAbuse({ ...base, mime: 'image/png' }), { allowed: false, category: 'invalid_type', code: 'mime_invalid' })
assert.deepEqual(evaluateUploadAbuse({ ...base, bytes: Buffer.from('not-pdf'), size: 7 }), { allowed: false, category: 'invalid_magic', code: 'magic_invalid' })
assert.deepEqual(evaluateUploadAbuse({ ...base, size: 99 }), { allowed: false, category: 'invalid_size', code: 'size_mismatch' })

const polyglot = Buffer.concat([png, Buffer.alloc(20), Buffer.from([0x50, 0x4b, 0x03, 0x04])])
assert.deepEqual(evaluateUploadAbuse({ filename: 'image.png', mime: 'image/png', bytes: polyglot, size: polyglot.byteLength }), { allowed: false, category: 'polyglot', code: 'embedded_archive_signature' })
const executablePolyglot = Buffer.concat([png, Buffer.alloc(20), Buffer.from([0x4d, 0x5a])])
assert.deepEqual(evaluateUploadAbuse({ filename: 'image.png', mime: 'image/png', bytes: executablePolyglot, size: executablePolyglot.byteLength }), { allowed: false, category: 'polyglot', code: 'embedded_executable_signature' })
const activePdf = Buffer.from('%PDF-1.7\n/JavaScript (blocked)')
assert.deepEqual(evaluateUploadAbuse({ ...base, bytes: activePdf, size: activePdf.byteLength }), { allowed: false, category: 'macro_or_active_content', code: 'active_content_signature' })

const xlsx = createXlsx(['row_id'], [['row-1']])
const validXlsx = evaluateUploadAbuse({ filename: 'accounting.xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', bytes: xlsx, size: xlsx.byteLength })
assert.equal(validXlsx.allowed, true)
if (validXlsx.allowed) assert.equal(validXlsx.kind, 'xlsx')
const macroXlsx = Buffer.concat([xlsx, Buffer.from('vbaProject')])
assert.deepEqual(evaluateUploadAbuse({ filename: 'accounting.xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', bytes: macroXlsx, size: macroXlsx.byteLength }), { allowed: false, category: 'macro_or_active_content', code: 'active_content_signature' })
assert.equal(JSON.stringify(polyglot).includes('document'), false)

console.log('upload-abuse-matrix.test: PASS (R10-V4-35)')
