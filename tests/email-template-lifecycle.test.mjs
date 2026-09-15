import assert from 'node:assert/strict'
import {
  archiveEmailTemplateVersion,
  cloneEmailTemplateVersion,
  createEmailTemplateVersion,
  publishEmailTemplateVersion,
  updateEmailTemplateDraft,
} from '../src/lib/email-template-lifecycle.ts'

const draft = createEmailTemplateVersion({
  id: 'tplv_1',
  templateId: 'tpl_1',
  version: 1,
  scope: { workspaceId: 'ws_1', formId: 'form_1', messageClass: 'notification' },
  name: 'Kayıt alındı',
  subject: 'Kayıt alındı',
  textBody: 'Başvurunuz alındı.',
  htmlBody: '<p>Başvurunuz alındı.</p>',
})

assert.equal(draft.status, 'draft')
assert(Object.isFrozen(draft))
assert(Object.isFrozen(draft.scope))

const edited = updateEmailTemplateDraft(draft, {
  subject: 'Katılımınız alındı',
  textBody: 'Katılımınız başarıyla kaydedildi.',
})
assert.equal(edited.version, 1)
assert.equal(edited.status, 'draft')
assert.equal(draft.subject, 'Kayıt alındı')
assert.equal(edited.subject, 'Katılımınız alındı')

const published = publishEmailTemplateVersion(edited)
assert.equal(published.status, 'published')
assert.throws(() => updateEmailTemplateDraft(published, { subject: 'Değişmemeli' }), /immutable/)
assert.throws(() => publishEmailTemplateVersion(published), /immutable/)

const archived = archiveEmailTemplateVersion(published)
assert.equal(archived.status, 'archived')
assert.throws(() => archiveEmailTemplateVersion(draft), /transition/)

const nextDraft = cloneEmailTemplateVersion(archived, { id: 'tplv_2' })
assert.equal(nextDraft.templateId, 'tpl_1')
assert.equal(nextDraft.version, 2)
assert.equal(nextDraft.status, 'draft')
assert.deepEqual(nextDraft.scope, draft.scope)

assert.throws(() => createEmailTemplateVersion({
  id: 'tplv_invalid',
  templateId: 'tpl_1',
  version: 1,
  scope: { workspaceId: '', messageClass: 'notification' },
  name: 'Geçersiz',
  subject: 'Konu',
  textBody: 'İçerik',
}), /workspace_scope_required/)
assert.throws(() => createEmailTemplateVersion({
  id: 'tplv_invalid_class',
  templateId: 'tpl_1',
  version: 1,
  scope: { workspaceId: 'ws_1', messageClass: 'unknown' },
  name: 'Geçersiz',
  subject: 'Konu',
  textBody: 'İçerik',
}), /message_class_invalid/)

console.log('email-template-lifecycle.test: PASS (MAIL-01)')
