import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { listBadgeTemplates } from '../src/lib/badge-template-catalog.ts'
import { createBadgeTemplateStorageKey } from '../src/lib/badge-template-contract.ts'

const root = await mkdtemp(path.join(tmpdir(), 'mavenforms-badge-catalog-'))
const scope = { workspaceId: 'workspace-1', formId: 'form-1', templateId: 'template-1', versionId: 'version-1' }
const key = createBadgeTemplateStorageKey(scope)
const file = path.join(root, `${key}.json`)
await mkdir(path.dirname(file), { recursive: true })
await writeFile(file, JSON.stringify({ ...scope, originalName: 'event.pdf', pageCount: 1, widthPt: 288, heightPt: 432, visibility: 'private', validationStatus: 'VALIDATED', storageKey: key }))
assert.deepEqual((await listBadgeTemplates({ workspaceId: scope.workspaceId, formId: scope.formId, rootDir: root })).templates[0].versionId, 'version-1')
assert.deepEqual(await listBadgeTemplates({ workspaceId: 'workspace/unsafe', formId: scope.formId, rootDir: root }), { ok: false, code: 'SCOPE_INVALID' })
console.log('badge-template-catalog: all assertions passed')
