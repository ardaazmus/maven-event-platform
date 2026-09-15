import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { PDFDocument } from 'pdf-lib'
import { storeBadgeTemplate, readBadgeTemplate } from '../src/lib/badge-template-storage.ts'

const root = await mkdtemp(`${tmpdir()}\\mavenforms-badge-template-`)
try {
  const pdf = await PDFDocument.create()
  pdf.addPage([300, 180])
  const bytes = await pdf.save()
  const scope = { workspaceId: 'workspace-1', formId: 'form-1', templateId: 'template-1', versionId: 'version-1' }
  const stored = await storeBadgeTemplate({ scope, originalName: 'badge.pdf', bytes, pageCount: 1, widthPt: 300, heightPt: 180, rootDir: root })
  assert.equal(stored.ok, true)
  assert.equal(stored.manifest.visibility, 'private')
  assert.equal((await readBadgeTemplate({ scope, rootDir: root })).ok, true)
  assert.deepEqual(await storeBadgeTemplate({ scope, originalName: 'badge.pdf', bytes, pageCount: 1, widthPt: 300, heightPt: 180, rootDir: root }), { ok: false, code: 'WRITE_CONFLICT' })
  assert.deepEqual(await storeBadgeTemplate({ scope: { ...scope, formId: '../other' }, originalName: 'badge.pdf', bytes, pageCount: 1, widthPt: 300, heightPt: 180, rootDir: root }), { ok: false, code: 'SCOPE_INVALID' })
} finally {
  await rm(root, { recursive: true, force: true })
}

console.log('badge-template-storage: all assertions passed (private PDF manifest)')
