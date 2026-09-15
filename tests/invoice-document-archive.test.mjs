import assert from 'node:assert/strict'
import { deflateRawSync } from 'node:zlib'
import { createXlsx } from '../src/lib/xlsx-export.ts'
import { validateInvoiceArchiveUpload } from '../src/lib/invoice-document-validation.ts'

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

function u16(value) {
  const out = Buffer.alloc(2)
  out.writeUInt16LE(value, 0)
  return out
}

function u32(value) {
  const out = Buffer.alloc(4)
  out.writeUInt32LE(value >>> 0, 0)
  return out
}

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function storeZip(files, options = {}) {
  const locals = []
  const centrals = []
  let offset = 0
  for (const file of files) {
    const name = Buffer.from(file.name, 'utf8')
    const plain = Buffer.from(file.content ?? '', 'utf8')
    const method = file.method ?? 0
    const content = method === 8 ? deflateRawSync(plain) : plain
    const flags = file.flags ?? 0
    const checksum = crc32(plain)
    const local = Buffer.concat([
      u32(0x04034b50), u16(20), u16(flags), u16(method), u16(0), u16(0), u32(checksum),
      u32(content.length), u32(plain.length), u16(name.length), u16(0), name, content,
    ])
    locals.push(local)
    centrals.push(Buffer.concat([
      u32(0x02014b50), u16(20), u16(20), u16(flags), u16(method), u16(0), u16(0), u32(checksum),
      u32(content.length), u32(plain.length), u16(name.length), u16(0), u16(0), u16(0), u16(0),
      u32(0), u32(offset), name,
    ]))
    offset += local.length
  }
  const localData = Buffer.concat(locals)
  const centralDirectory = Buffer.concat(centrals)
  const eocd = Buffer.concat([
    u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length),
    u32(centralDirectory.length), u32(localData.length), u16(0),
  ])
  const archive = Buffer.concat([localData, centralDirectory, eocd])
  if (options.patch) options.patch(archive, localData.length)
  return archive
}

function upload(bytes, filename = 'accounting.xlsx', mime = XLSX_MIME) {
  return validateInvoiceArchiveUpload({ filename, mime, size: bytes.byteLength, bytes })
}

const validXlsx = createXlsx(['row_id'], [['row-1']])
const valid = upload(validXlsx)
assert.equal(valid.ok, true, 'valid XLSX must pass the archive boundary')
if (valid.ok) {
  assert.deepEqual(
    { kind: valid.kind, archiveKind: valid.archiveKind, entryCount: valid.entryCount },
    { kind: 'xlsx', archiveKind: 'zip', entryCount: 5 },
  )
  assert.match(valid.sha256, /^[a-f0-9]{64}$/)
}

assert.equal(upload(validXlsx, 'accounting.xlsm').ok, false, 'macro-enabled extension must be rejected')
assert.equal(upload(validXlsx, 'accounting.xlsx', 'application/pdf').ok, false, 'declared MIME must be restricted')
assert.equal(upload(Buffer.from('not-a-zip')).ok, false, 'ZIP magic is required')

const macro = storeZip([
  { name: '[Content_Types].xml', content: '<Types ContentType="macroEnabled"/>' },
  { name: 'xl/workbook.xml', content: '<workbook/>' },
  { name: 'xl/vbaProject.bin', content: 'macro' },
])
assert.equal(upload(macro).ok, false, 'VBA macro entries must be rejected')

const externalLink = storeZip([
  { name: '[Content_Types].xml', content: '<Types/>' },
  { name: 'xl/workbook.xml', content: '<workbook/>' },
  { name: 'xl/_rels/workbook.xml.rels', content: '<Relationship Target="https://outside.example" TargetMode="External"/>' },
])
assert.equal(upload(externalLink).ok, false, 'external relationships must be rejected')

const traversal = storeZip([
  { name: '[Content_Types].xml', content: '<Types/>' },
  { name: 'xl/workbook.xml', content: '<workbook/>' },
  { name: '../outside.xml', content: 'sensitive' },
])
assert.equal(upload(traversal).ok, false, 'archive path traversal must be rejected')

const nested = storeZip([
  { name: '[Content_Types].xml', content: '<Types/>' },
  { name: 'xl/workbook.xml', content: '<workbook/>' },
  { name: 'xl/nested.zip', content: 'PK\u0003\u0004' },
])
assert.equal(upload(nested).ok, false, 'nested archives must be rejected')

const encrypted = storeZip([
  { name: '[Content_Types].xml', content: '<Types/>', flags: 1 },
  { name: 'xl/workbook.xml', content: '<workbook/>' },
])
assert.equal(upload(encrypted).ok, false, 'encrypted entries must be rejected')

const externalDeflated = storeZip([
  { name: '[Content_Types].xml', content: '<Types/>', method: 8 },
  { name: 'xl/workbook.xml', content: '<workbook/>', method: 8 },
  { name: 'xl/_rels/workbook.xml.rels', content: '<Relationship Target="file:///outside" TargetMode="External"/>', method: 8 },
])
assert.equal(upload(externalDeflated).ok, false, 'deflated external relationships must be rejected')

const archiveBomb = storeZip([
  { name: '[Content_Types].xml', content: '<Types/>' },
  { name: 'xl/workbook.xml', content: 'small' },
], {
  patch: (archive, centralOffset) => archive.writeUInt32LE(0xffffffff, centralOffset + 20),
})
assert.equal(upload(archiveBomb).ok, false, 'unsafe archive size metadata must be rejected')

const results = [valid, upload(macro), upload(externalLink), upload(traversal), upload(nested), upload(encrypted)]
assert(!results.some((result) => JSON.stringify(result).includes('sensitive')), 'archive content must not be echoed')

console.log('invoice-document-archive.test: PASS (INV/F-U-01-01)')
