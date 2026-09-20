import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { findBadgeTemplate, listBadgeTemplates } from '../src/lib/badge-template-catalog.ts'
import { createBadgeTemplateStorageKey } from '../src/lib/badge-template-contract.ts'

const root = await mkdtemp(path.join(tmpdir(), 'mavenforms-badge-catalog-'))
const scope = { workspaceId: 'workspace-1', formId: 'form-1', templateId: 'template-1', versionId: 'version-1' }
const key = createBadgeTemplateStorageKey(scope)
const file = path.join(root, `${key}.json`)
await mkdir(path.dirname(file), { recursive: true })
await writeFile(file, JSON.stringify({ ...scope, originalName: 'event.pdf', pageCount: 1, widthPt: 288, heightPt: 432, visibility: 'private', validationStatus: 'VALIDATED', storageKey: key }))
assert.deepEqual((await listBadgeTemplates({ workspaceId: scope.workspaceId, formId: scope.formId, rootDir: root })).templates[0].versionId, 'version-1')
assert.deepEqual(await listBadgeTemplates({ workspaceId: 'workspace/unsafe', formId: scope.formId, rootDir: root }), { ok: false, code: 'SCOPE_INVALID' })

// Legacy pdf manifest (formatsuz) pdf varsayılır
const legacy = await findBadgeTemplate({ ...scope, rootDir: root })
assert.equal(legacy?.format, 'pdf', 'legacy format pdf olmali')

// Raster manifest (png) listelenir ve bulunur
const rasterScope = { workspaceId: 'workspace-1', formId: 'form-1', templateId: 'template-2', versionId: 'version-1' }
const rasterKey = createBadgeTemplateStorageKey(rasterScope, 'png')
const rasterFile = path.join(root, `${rasterKey}.json`)
await mkdir(path.dirname(rasterFile), { recursive: true })
await writeFile(rasterFile, JSON.stringify({ ...rasterScope, originalName: 'sablon.png', format: 'png', pageCount: 1, widthPt: 1748, heightPt: 1240, visibility: 'private', validationStatus: 'VALIDATED', storageKey: rasterKey }))
const listed = await listBadgeTemplates({ workspaceId: 'workspace-1', formId: 'form-1', rootDir: root })
assert.equal(listed.templates.length, 2, 'pdf + png listelenmeli')
const found = await findBadgeTemplate({ ...rasterScope, rootDir: root })
assert.equal(found?.format, 'png', 'png formati korunmali')
assert.equal(found?.originalName, 'sablon.png', 'png adi korunmali')

// Yanlış format etiketi reddedilir
const badScope = { workspaceId: 'workspace-1', formId: 'form-1', templateId: 'template-3', versionId: 'version-1' }
const badKey = createBadgeTemplateStorageKey(badScope, 'png')
const badFile = path.join(root, `${badKey}.json`)
await mkdir(path.dirname(badFile), { recursive: true })
await writeFile(badFile, JSON.stringify({ ...badScope, originalName: 'sablon.png', format: 'pdf', pageCount: 1, widthPt: 100, heightPt: 100, visibility: 'private', validationStatus: 'VALIDATED', storageKey: badKey }))
assert.equal(await findBadgeTemplate({ ...badScope, rootDir: root }), null, 'format/key uyumsuzlugu reddedilmeli')

console.log('badge-template-catalog: all assertions passed')
