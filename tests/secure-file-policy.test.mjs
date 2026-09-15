import assert from 'node:assert/strict'
import { createXlsx } from '../src/lib/xlsx-export.ts'
import { INVOICE_DOCUMENT_MAX_SIZE, validateSecureUpload } from '../src/lib/invoice-document-validation.ts'

const encoder = new TextEncoder()
const pdf = encoder.encode('%PDF-1.7\ninvoice')
const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])
const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00])
const webp = Uint8Array.from([...encoder.encode('RIFF'), 0x00, 0x00, 0x00, 0x00, ...encoder.encode('WEBP')])

function upload(bytes, filename, mime) {
  return validateSecureUpload({ filename, mime, size: bytes.byteLength, bytes })
}

const validCases = [
  [pdf, 'invoice.pdf', 'application/pdf', 'pdf'],
  [png, 'logo.png', 'image/png', 'png'],
  [jpeg, 'photo.jpg', 'image/jpeg', 'jpeg'],
  [webp, 'cover.webp', 'image/webp', 'webp'],
  [createXlsx(['row_id'], [['row-1']]), 'accounting.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'xlsx'],
]

for (const [bytes, filename, mime, kind] of validCases) {
  const result = upload(bytes, filename, mime)
  assert.equal(result.ok, true, `${filename} must pass the shared boundary`)
  if (result.ok) {
    assert.equal(result.kind, kind)
    assert.equal(result.size, bytes.byteLength)
    assert.match(result.sha256, /^[a-f0-9]{64}$/)
  }
}

assert.equal(upload(pdf, 'invoice.pdf', 'image/png').ok, false, 'MIME mismatch must fail closed')
assert.equal(upload(encoder.encode('not-an-image'), 'logo.png', 'image/png').ok, false, 'image magic mismatch must fail closed')
assert.equal(upload(pdf, 'invoice.exe', 'application/pdf').ok, false, 'unsupported extension must fail closed')
assert.equal(validateSecureUpload({ filename: 'invoice.pdf', mime: 'application/pdf', size: INVOICE_DOCUMENT_MAX_SIZE + 1, bytes: pdf }).ok, false, 'oversized uploads must fail closed')

const result = upload(pdf, 'invoice.pdf', 'application/pdf')
assert(!JSON.stringify(result).includes('%PDF-'), 'validation result must not echo file content')

console.log('secure-file-policy.test: PASS (R10-V4-08)')
