import type { BadgeGenerationJob } from './badge-generation-job-contract'

export type BadgeTemplateBinding = Readonly<{
  templateId: string
  templateVersionId: string
  workspaceId: string
  formId: string
  faceMode: BadgeGenerationJob['faceMode']
  pageCount: 1 | 2
}>

export type BadgeTemplateBindingValidationCode =
  | 'OK'
  | 'IDENTIFIER_INVALID'
  | 'PRIVATE_REQUIRED'
  | 'TEMPLATE_NOT_VALIDATED'
  | 'SCOPE_MISMATCH'
  | 'VERSION_MISMATCH'
  | 'PAGE_COUNT_MISMATCH'

function isSafeIdentifier(value: string) {
  return Boolean(value.trim()) && !/[\\/:\s]/u.test(value)
}

export function bindBadgeTemplateToGenerationJob(input: Readonly<{
  job: Pick<BadgeGenerationJob, 'workspaceId' | 'formId' | 'templateVersionId' | 'faceMode'>
  template: Readonly<{
    templateId: string
    versionId: string
    workspaceId: string
    formId: string
    pageCount: 1 | 2
    visibility: 'private' | 'published'
    validationStatus: 'VALIDATED' | 'REJECTED'
  }>
}>): { ok: true; binding: BadgeTemplateBinding } | { ok: false; code: BadgeTemplateBindingValidationCode } {
  const ids = [input.job.workspaceId, input.job.formId, input.job.templateVersionId, input.template.templateId, input.template.versionId, input.template.workspaceId, input.template.formId]
  if (ids.some(id => !isSafeIdentifier(id))) return { ok: false, code: 'IDENTIFIER_INVALID' }
  if (input.template.visibility !== 'private') return { ok: false, code: 'PRIVATE_REQUIRED' }
  if (input.template.validationStatus !== 'VALIDATED') return { ok: false, code: 'TEMPLATE_NOT_VALIDATED' }
  if (input.template.workspaceId !== input.job.workspaceId || input.template.formId !== input.job.formId) return { ok: false, code: 'SCOPE_MISMATCH' }
  if (input.template.versionId !== input.job.templateVersionId) return { ok: false, code: 'VERSION_MISMATCH' }
  const expectedPageCount = input.job.faceMode === 'SINGLE_FACE' ? 1 : 2
  if (input.template.pageCount !== expectedPageCount) return { ok: false, code: 'PAGE_COUNT_MISMATCH' }

  return {
    ok: true,
    binding: {
      templateId: input.template.templateId,
      templateVersionId: input.template.versionId,
      workspaceId: input.job.workspaceId,
      formId: input.job.formId,
      faceMode: input.job.faceMode,
      pageCount: input.template.pageCount,
    },
  }
}
