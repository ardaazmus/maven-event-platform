import assert from 'node:assert'
import { buildTransactionalEmail, safeEmailLogContext } from '../src/lib/email-template-policy.ts'

const rendered = buildTransactionalEmail({
  messageClass: 'transactional',
  subject: 'Fatura hazır',
  textBody: 'Merhaba <script>alert(1)</script>',
  documentUrl: 'https://app.example.com/documents/invoice-1',
  appOrigin: 'https://app.example.com',
})

assert.equal(rendered.subject, 'Fatura hazır')
assert(rendered.html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), 'user text must be escaped in HTML')
assert(rendered.html.includes('https://app.example.com/documents/invoice-1'), 'transactional document link must be retained')
assert.throws(() => buildTransactionalEmail({
  messageClass: 'transactional',
  subject: 'Fatura',
  textBody: 'İçerik',
  providerUrl: 'https://provider.example.com/temporary-pdf',
  appOrigin: 'https://app.example.com',
}), /raw provider URL is not allowed/)
assert.throws(() => buildTransactionalEmail({
  messageClass: 'transactional',
  subject: 'Fatura',
  textBody: 'İçerik',
  documentUrl: 'https://external.example.com/invoice',
  appOrigin: 'https://app.example.com',
}), /document URL must belong to the app origin/)
assert.throws(() => buildTransactionalEmail({
  messageClass: 'transactional',
  subject: 'Fatura',
  textBody: 'Kampanya utm_source=mail',
  appOrigin: 'https://app.example.com',
}), /campaign content is not allowed/)

const logContext = safeEmailLogContext({
  messageId: 'msg-1',
  messageClass: 'transactional',
  provider: 'ses',
  recipientEmail: 'person@example.com',
  providerSecret: 'must-not-log',
  body: 'must-not-log',
})
assert.deepEqual(logContext, { messageId: 'msg-1', messageClass: 'transactional', provider: 'ses' })
assert(!JSON.stringify(logContext).includes('person@example.com'))

console.log('email-template-policy.test: PASS (MAIL-09)')
