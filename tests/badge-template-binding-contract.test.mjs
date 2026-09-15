import assert from 'node:assert/strict'
import { bindBadgeTemplateToGenerationJob } from '../src/lib/badge-template-binding-contract.ts'

const job = { workspaceId: 'workspace-1', formId: 'form-1', templateVersionId: 'version-1', faceMode: 'SINGLE_FACE' }
const template = { templateId: 'template-1', versionId: 'version-1', workspaceId: 'workspace-1', formId: 'form-1', pageCount: 1, visibility: 'private', validationStatus: 'VALIDATED' }

assert.deepEqual(bindBadgeTemplateToGenerationJob({ job, template }), {
  ok: true,
  binding: { templateId: 'template-1', templateVersionId: 'version-1', workspaceId: 'workspace-1', formId: 'form-1', faceMode: 'SINGLE_FACE', pageCount: 1 },
})
assert.deepEqual(bindBadgeTemplateToGenerationJob({ job: { ...job, faceMode: 'DUAL_FACE' }, template: { ...template, pageCount: 2 } }).binding, {
  templateId: 'template-1', templateVersionId: 'version-1', workspaceId: 'workspace-1', formId: 'form-1', faceMode: 'DUAL_FACE', pageCount: 2,
})
assert.deepEqual(bindBadgeTemplateToGenerationJob({ job, template: { ...template, visibility: 'published' } }), { ok: false, code: 'PRIVATE_REQUIRED' })
assert.deepEqual(bindBadgeTemplateToGenerationJob({ job, template: { ...template, validationStatus: 'REJECTED' } }), { ok: false, code: 'TEMPLATE_NOT_VALIDATED' })
assert.deepEqual(bindBadgeTemplateToGenerationJob({ job, template: { ...template, workspaceId: 'workspace-2' } }), { ok: false, code: 'SCOPE_MISMATCH' })
assert.deepEqual(bindBadgeTemplateToGenerationJob({ job, template: { ...template, versionId: 'version-2' } }), { ok: false, code: 'VERSION_MISMATCH' })
assert.deepEqual(bindBadgeTemplateToGenerationJob({ job, template: { ...template, pageCount: 2 } }), { ok: false, code: 'PAGE_COUNT_MISMATCH' })

console.log('badge-template-binding-contract: all assertions passed')
