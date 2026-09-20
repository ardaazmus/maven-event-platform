import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { readBadgeTemplate, storeBadgeTemplate } from '../src/lib/badge-template-storage.ts'

// F4-R4: badge template storage round-trip (gerçek fs, tmpdir).

const root = await mkdtemp(path.join(tmpdir(), 'mavenforms-badge-storage-'))
const pdfBytes = new TextEncoder().encode('%PDF-1.7\nstatic background\n%%EOF')
const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01])
const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])
const webpBytes = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x10, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50])
const scope = (n) => ({ workspaceId: 'workspace-1', formId: 'form-1', templateId: `template-${n}`, versionId: `version-${n}` })

// PDF round-trip
const storedPdf = await storeBadgeTemplate({ scope: scope('pdf'), originalName: 'sablon.pdf', mime: 'application/pdf', bytes: pdfBytes, pageCount: 1, widthPt: 288, heightPt: 432, rootDir: root })
assert.equal(storedPdf.ok, true, 'pdf saklanmali')
assert.equal(storedPdf.manifest.format, 'pdf', 'pdf formati yazilmali')
assert.ok(storedPdf.manifest.storageKey.endsWith('source.pdf'), 'pdf key uzantisi olmali')
const readPdf = await readBadgeTemplate({ scope: scope('pdf'), rootDir: root })
assert.equal(readPdf.ok, true, 'pdf okunmali')
assert.deepEqual(readPdf.bytes, pdfBytes, 'pdf bytes birebir olmali')

// Raster round-trip (png + jpeg + webp)
for (const [name, mime, bytes] of [['sablon.png', 'image/png', pngBytes], ['sablon.jpg', 'image/jpeg', jpegBytes], ['sablon.webp', 'image/webp', webpBytes]]) {
  const tag = mime.split('/')[1]
  const stored = await storeBadgeTemplate({ scope: scope(tag), originalName: name, mime, bytes, pageCount: 1, widthPt: 100, heightPt: 100, rootDir: root })
  assert.equal(stored.ok, true, `${tag} saklanmali`)
  const read = await readBadgeTemplate({ scope: scope(tag), rootDir: root })
  assert.equal(read.ok, true, `${tag} okunmali`)
  assert.deepEqual(read.bytes, bytes, `${tag} bytes birebir olmali`)
  assert.equal(read.manifest.format, stored.manifest.format, `${tag} formati korunmali`)
}

// Uyumsuz bildirim reddedilir
const mismatch = await storeBadgeTemplate({ scope: scope('mix'), originalName: 'sablon.png', mime: 'image/jpeg', bytes: pngBytes, pageCount: 1, widthPt: 100, heightPt: 100, rootDir: root })
assert.deepEqual(mismatch, { ok: false, code: 'FORMAT_MISMATCH' }, 'mime/ext/magic celiskisi reddedilmeli')

// Legacy manifest (formatsuz pdf) okunur, format pdf varsayilir
const legacyScope = scope('legacy')
const legacyKey = `private/workspaces/${legacyScope.workspaceId}/forms/${legacyScope.formId}/badge-templates/${legacyScope.templateId}/${legacyScope.versionId}/source.pdf`
const legacyFile = path.join(root, legacyKey)
await mkdir(path.dirname(legacyFile), { recursive: true })
await writeFile(legacyFile, pdfBytes)
await writeFile(`${legacyFile}.json`, JSON.stringify({ ...legacyScope, originalName: 'eski.pdf', pageCount: 1, widthPt: 288, heightPt: 432, visibility: 'private', validationStatus: 'VALIDATED', storageKey: legacyKey }))
const legacy = await readBadgeTemplate({ scope: legacyScope, rootDir: root })
assert.equal(legacy.ok, true, 'legacy pdf okunmali')
assert.equal(legacy.manifest.format, 'pdf', 'legacy format pdf varsayilmali')

// Guard'lar: scope + conflict + not-found
assert.deepEqual(
  await storeBadgeTemplate({ scope: { ...scope('x'), workspaceId: 'work/space' }, originalName: 'a.pdf', mime: 'application/pdf', bytes: pdfBytes, pageCount: 1, widthPt: 1, heightPt: 1, rootDir: root }),
  { ok: false, code: 'SCOPE_INVALID' },
  'guvensiz scope reddedilmeli',
)
assert.deepEqual(
  await storeBadgeTemplate({ scope: scope('pdf'), originalName: 'sablon.pdf', mime: 'application/pdf', bytes: pdfBytes, pageCount: 1, widthPt: 288, heightPt: 432, rootDir: root }),
  { ok: false, code: 'WRITE_CONFLICT' },
  'overwrite conflict olmali',
)
assert.deepEqual(await readBadgeTemplate({ scope: scope('yok'), rootDir: root }), { ok: false, code: 'NOT_FOUND' }, 'kayip sablon not-found olmali')

console.log('badge-template-storage.test: PASS (round-trip + legacy + guard)')
