import type { EmailMessageClass } from './email-policy'

export type EmailTemplateStatus = 'draft' | 'published' | 'archived'

export type EmailTemplateScope = Readonly<{
  workspaceId: string
  formId?: string
  messageClass: EmailMessageClass
}>

export type EmailTemplateVersion = Readonly<{
  id: string
  templateId: string
  version: number
  scope: EmailTemplateScope
  status: EmailTemplateStatus
  name: string
  subject: string
  textBody: string
  htmlBody?: string
}>

type EmailTemplateContentPatch = Partial<Pick<EmailTemplateVersion, 'name' | 'subject' | 'textBody' | 'htmlBody'>>

const MESSAGE_CLASSES = new Set<EmailMessageClass>(['transactional', 'notification', 'marketing'])

function requireText(value: string, error: string): string {
  if (!value.trim()) {
    throw new Error(error)
  }
  return value
}

function freezeScope(scope: EmailTemplateScope): EmailTemplateScope {
  const workspaceId = requireText(scope.workspaceId, 'workspace_scope_required')
  if (scope.formId !== undefined && !scope.formId.trim()) {
    throw new Error('form_scope_invalid')
  }
  if (!MESSAGE_CLASSES.has(scope.messageClass)) {
    throw new Error('message_class_invalid')
  }
  return Object.freeze({ ...scope, workspaceId })
}

function freezeVersion(input: Omit<EmailTemplateVersion, 'scope'> & { scope: EmailTemplateScope }): EmailTemplateVersion {
  requireText(input.id, 'template_version_id_required')
  requireText(input.templateId, 'template_id_required')
  if (!Number.isInteger(input.version) || input.version < 1) {
    throw new Error('template_version_invalid')
  }
  requireText(input.name, 'template_name_required')
  requireText(input.subject, 'template_subject_required')
  requireText(input.textBody, 'template_text_required')
  return Object.freeze({
    ...input,
    scope: freezeScope(input.scope),
  })
}

export function createEmailTemplateVersion(input: {
  id: string
  templateId: string
  version: number
  scope: EmailTemplateScope
  name: string
  subject: string
  textBody: string
  htmlBody?: string
  status?: EmailTemplateStatus
}): EmailTemplateVersion {
  if (input.status !== undefined && input.status !== 'draft') {
    throw new Error('new_template_must_start_as_draft')
  }
  return freezeVersion({ ...input, status: 'draft' })
}

export function updateEmailTemplateDraft(
  template: EmailTemplateVersion,
  patch: EmailTemplateContentPatch,
): EmailTemplateVersion {
  if (template.status !== 'draft') {
    throw new Error('published_template_immutable')
  }
  return freezeVersion({ ...template, ...patch })
}

export function publishEmailTemplateVersion(template: EmailTemplateVersion): EmailTemplateVersion {
  if (template.status !== 'draft') {
    throw new Error('published_template_immutable')
  }
  return freezeVersion({ ...template, status: 'published' })
}

export function archiveEmailTemplateVersion(template: EmailTemplateVersion): EmailTemplateVersion {
  if (template.status !== 'published') {
    throw new Error('template_transition_invalid')
  }
  return freezeVersion({ ...template, status: 'archived' })
}

export function cloneEmailTemplateVersion(
  template: EmailTemplateVersion,
  input: { id: string },
): EmailTemplateVersion {
  return createEmailTemplateVersion({
    ...template,
    id: input.id,
    version: template.version + 1,
    status: 'draft',
  })
}
