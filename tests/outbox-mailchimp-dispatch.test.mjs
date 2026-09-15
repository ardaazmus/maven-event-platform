import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { encryptEmailCredential } from '../src/lib/email-credentials.ts'
import { prepareOutboxMailchimpDispatch, sendOutboxMailchimpEmail } from '../src/lib/outbox-mailchimp-dispatch.ts'

const connectionConfig = JSON.stringify({
  appOrigin: 'https://forms.example.com',
  senderProfile: {
    workspaceId: 'ws_1',
    messageClass: 'notification',
    provider: 'mailchimp_transactional',
    sendingDomain: 'mail.example.com',
    fromAddress: 'MavenForms <notify@mail.example.com>',
    healthStatus: 'healthy',
    enabled: true,
  },
  domainHealth: {
    domain: 'mail.example.com',
    spf: 'pass',
    dkim: 'pass',
    dmarc: 'pass',
    alignment: 'pass',
    tls: 'pass',
  },
})

const result = prepareOutboxMailchimpDispatch({
  outboxEvent: {
    id: 'outbox_123',
    workspaceId: 'ws_1',
    type: 'email',
    queueClass: 'notification',
    payloadJson: JSON.stringify({
      recipientEmail: 'Customer@example.com',
      subject: 'Yeni kayıt',
      textBody: 'Yeni başvuru alındı.',
    }),
  },
  connection: {
    id: 'connection_123',
    workspaceId: 'ws_1',
    provider: 'mailchimp_transactional',
    status: 'active',
    publicConfigJson: connectionConfig,
    credentialsEnvelope: 'v1:key-1:iv:tag:ciphertext',
  },
})

assert.equal(result.status, 'ready')
if (result.status === 'ready') {
  assert.deepEqual(result.command, {
    status: 'ready',
    provider: 'mailchimp_transactional',
    action: 'send_message',
    workspaceId: 'ws_1',
    messageId: 'outbox_123',
    messageClass: 'notification',
    recipientEmail: 'customer@example.com',
    subject: 'Yeni kayıt',
    textBody: 'Yeni başvuru alındı.',
    htmlBody: '<p>Yeni başvuru alındı.</p>',
  })
  assert.equal(JSON.stringify(result.command).includes('ciphertext'), false)
}

assert.deepEqual(
  prepareOutboxMailchimpDispatch({
    outboxEvent: {
      id: 'outbox_456',
      workspaceId: 'ws_1',
      type: 'email',
      queueClass: 'notification',
      payloadJson: JSON.stringify({ recipientEmail: 'customer@example.com', subject: 'Kayıt', textBody: 'İçerik' }),
    },
    connection: { id: 'connection_123', workspaceId: 'ws_1', provider: 'mailchimp_transactional', status: 'draft', publicConfigJson: connectionConfig, credentialsEnvelope: 'v1:key-1:iv:tag:ciphertext' },
  }),
  { status: 'blocked', reason: 'connection_not_active' },
)

const env = {
  MAVENFORMS_EMAIL_ENCRYPTION_KEY: randomBytes(32).toString('base64url'),
  MAVENFORMS_EMAIL_ENCRYPTION_KEY_ID: 'test-key',
}
let requestBody
const accepted = await sendOutboxMailchimpEmail({
  outboxEvent: {
    id: 'outbox_789',
    workspaceId: 'ws_1',
    type: 'email',
    queueClass: 'notification',
    payloadJson: JSON.stringify({ recipientEmail: 'customer@example.com', subject: 'Kayıt', textBody: 'İçerik' }),
  },
  connection: { id: 'connection_123', workspaceId: 'ws_1', provider: 'mailchimp_transactional', status: 'active', publicConfigJson: connectionConfig, credentialsEnvelope: encryptEmailCredential('live-key', env) },
  env,
  fetchImpl: async (_url, init) => {
    requestBody = JSON.parse(init?.body?.toString() || '{}')
    return new Response(JSON.stringify([{ email: 'customer@example.com', status: 'sent', _id: 'tx_789' }]), { status: 200 })
  },
})
assert.deepEqual(accepted, { sendStatus: 'accepted', deliveryStatus: 'pending', providerMessageId: 'tx_789' })
assert.equal(requestBody.key, 'live-key')
assert.equal(requestBody.message.metadata.mavenforms_message_id, 'outbox_789')
assert.equal(JSON.stringify(accepted).includes('live-key'), false)

console.log('outbox-mailchimp-dispatch.test: PASS (MAIL-13J)')
