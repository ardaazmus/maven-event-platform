import assert from 'node:assert/strict'
import { createBadgeAuditEvent, createBadgeReprintPlan, createBadgeTemplateVersion } from '../src/lib/badge-version-audit-contract.ts'

const version = createBadgeTemplateVersion({ workspaceId: 'workspace-1', formId: 'form-1', templateId: 'template-1', versionId: 'version-2', createdAtMs: 10_000 })
assert.deepEqual(version, {
  ok: true,
  version: { workspaceId: 'workspace-1', formId: 'form-1', templateId: 'template-1', versionId: 'version-2', createdAtMs: 10_000, immutable: true },
})

const reprint = createBadgeReprintPlan({ sourceArtifactId: 'artifact-1', sourceTemplateVersionId: 'version-1', newTemplateVersionId: 'version-2', newGenerationJobId: 'job-2', newOutputId: 'output-2', reason: 'Şablon düzeltmesi' })
assert.deepEqual(reprint, {
  ok: true,
  plan: { sourceArtifactId: 'artifact-1', sourceTemplateVersionId: 'version-1', newTemplateVersionId: 'version-2', newGenerationJobId: 'job-2', newOutputId: 'output-2', reason: 'Şablon düzeltmesi', replacesSource: false },
})
assert.deepEqual(createBadgeReprintPlan({ sourceArtifactId: 'artifact-1', sourceTemplateVersionId: 'version-1', newTemplateVersionId: 'version-2', newGenerationJobId: 'job-2', newOutputId: 'artifact-1', reason: 'retry' }), { ok: false, code: 'SOURCE_OVERWRITE_FORBIDDEN' })
assert.deepEqual(createBadgeReprintPlan({ sourceArtifactId: 'artifact-1', sourceTemplateVersionId: 'version-1', newTemplateVersionId: 'version-2', newGenerationJobId: 'job-2', newOutputId: 'output-2', reason: ' ' }), { ok: false, code: 'REASON_REQUIRED' })

const audit = createBadgeAuditEvent({ eventId: 'event-1', code: 'REPRINT_REQUESTED', workspaceId: 'workspace-1', formId: 'form-1', subjectId: 'job-2', occurredAtMs: 11_000 })
assert.deepEqual(audit, { ok: true, event: { eventId: 'event-1', code: 'REPRINT_REQUESTED', workspaceId: 'workspace-1', formId: 'form-1', subjectId: 'job-2', occurredAtMs: 11_000 } })
assert.equal('email' in audit.event, false)
assert.deepEqual(createBadgeTemplateVersion({ workspaceId: 'workspace/unsafe', formId: 'form-1', templateId: 'template-1', versionId: 'version-2', createdAtMs: 10_000 }), { ok: false, code: 'IDENTIFIER_INVALID' })

console.log('badge-version-audit-contract: all assertions passed')
