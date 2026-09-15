import assert from 'node:assert/strict'
import {
  EMAIL_TEMPLATE_MERGE_TAGS,
  renderEmailTemplateContent,
} from '../src/lib/email-template-content.ts'

assert(EMAIL_TEMPLATE_MERGE_TAGS.some(tag => tag.name === 'participant.name'))
assert(EMAIL_TEMPLATE_MERGE_TAGS.some(tag => tag.name === 'payment.status'))
assert.equal(EMAIL_TEMPLATE_MERGE_TAGS.some(tag => /provider|token|internal|card|bank/i.test(tag.name)), false)

const rendered = renderEmailTemplateContent({
  subject: '{{event.name}} kaydınız alındı',
  textBody: 'Merhaba {{participant.name}}, {{registration.method}} yöntemiyle kaydınız alındı.',
  htmlBody: '<p>Merhaba <strong>{{participant.name}}</strong></p>',
  values: {
    'event.name': 'Teknoloji Zirvesi',
    'participant.name': '<Deneme>',
    'registration.method': 'Sponsorluk',
  },
})

assert.equal(rendered.subject, 'Teknoloji Zirvesi kaydınız alındı')
assert.equal(rendered.textBody, 'Merhaba <Deneme>, Sponsorluk yöntemiyle kaydınız alındı.')
assert(rendered.htmlBody.includes('&lt;Deneme&gt;'), 'HTML merge values must be escaped')
assert.throws(() => renderEmailTemplateContent({
  subject: '{{provider.secret}}',
  textBody: 'İçerik',
  values: {},
}), /merge_tag_invalid/)
assert.throws(() => renderEmailTemplateContent({
  subject: '{{event.name}}',
  textBody: 'İçerik',
  values: { 'event.name': 'Güvenli\nSahte Başlık' },
}), /subject_invalid/)

console.log('email-template-content.test: PASS (MAIL-02)')
