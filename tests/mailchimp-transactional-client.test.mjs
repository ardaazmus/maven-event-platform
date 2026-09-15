import assert from 'node:assert'
import { randomBytes } from 'node:crypto'
import { encryptEmailCredential } from '../src/lib/email-credentials.ts'
import { normalizeDomainHealth } from '../src/lib/email-domain-health.ts'
import { normalizeSenderProfile } from '../src/lib/email-sender-profile.ts'
import {
  prepareMailchimpTransactionalSend,
  sendMailchimpTransactionalMessage,
} from '../src/lib/mailchimp-transactional-adapter.ts'

const env = {
  MAVENFORMS_EMAIL_ENCRYPTION_KEY: randomBytes(32).toString('base64url'),
  MAVENFORMS_EMAIL_ENCRYPTION_KEY_ID: 'test-key',
}

const senderProfile = {
  ...normalizeSenderProfile({
    workspaceId: 'ws_1',
    messageClass: 'transactional',
    provider: 'mailchimp_transactional',
    sendingDomain: 'billing.example.com',
    fromAddress: 'Billing <billing@billing.example.com>',
    replyToAddress: 'support@billing.example.com',
  }),
  healthStatus: 'healthy',
  enabled: true,
}

const command = prepareMailchimpTransactionalSend({
  workspaceId: 'ws_1',
  messageId: 'msg_1',
  messageClass: 'transactional',
  recipientEmail: 'Customer@example.com',
  subject: 'Faturanız hazır',
  textBody: 'Faturanız güvenli bağlantıdan görüntülenebilir.',
  appOrigin: 'https://app.example.com',
  senderProfile,
  domainHealth: normalizeDomainHealth({
    domain: 'billing.example.com',
    spf: 'pass',
    dkim: 'pass',
    dmarc: 'pass',
    alignment: 'pass',
    tls: 'pass',
  }),
  providerApiKeyEnvelope: 'v1:key-1:iv:tag:ciphertext',
})

assert.equal(command.status, 'ready')

const credentialEnvelope = encryptEmailCredential('live-key', env)
let request
const accepted = await sendMailchimpTransactionalMessage({
  command,
  senderProfile,
  providerApiKeyEnvelope: credentialEnvelope,
  env,
  fetchImpl: async (url, init) => {
    request = { url, init }
    return new Response(JSON.stringify([{ email: 'customer@example.com', status: 'sent', _id: 'tx_1' }]), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  },
})

assert.deepEqual(accepted, {
  sendStatus: 'accepted',
  deliveryStatus: 'pending',
  providerMessageId: 'tx_1',
})
assert.equal(request.url, 'https://mandrillapp.com/api/1.0/messages/send.json')
assert.equal(request.init.method, 'POST')
assert.equal(request.init.headers['content-type'], 'application/json')
const body = JSON.parse(request.init.body)
assert.equal(body.key, 'live-key')
assert.equal(body.message.from_email, 'billing@billing.example.com')
assert.equal(body.message.from_name, 'Billing')
assert.equal(body.message.headers['Reply-To'], 'support@billing.example.com')
assert.deepEqual(body.message.to, [{ email: 'customer@example.com', type: 'to' }])
assert.equal(body.message.metadata.mavenforms_message_id, 'msg_1')
assert.equal(body.key === credentialEnvelope, false)

const rejected = await sendMailchimpTransactionalMessage({
  command,
  senderProfile,
  providerApiKeyEnvelope: credentialEnvelope,
  env,
  fetchImpl: async () => new Response(JSON.stringify([{ email: 'customer@example.com', status: 'rejected', _id: 'tx_2' }]), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  }),
})
assert.deepEqual(rejected, {
  sendStatus: 'rejected',
  deliveryStatus: 'not_delivered',
  reason: 'rejected',
})

let blockedRequestCount = 0
await assert.rejects(
  sendMailchimpTransactionalMessage({
    command,
    senderProfile,
    providerApiKeyEnvelope: credentialEnvelope,
    env: { ...env, MAVENFORMS_EMAIL_ENCRYPTION_KEY_ID: 'old-key' },
    fetchImpl: async () => {
      blockedRequestCount += 1
      return new Response('{}')
    },
  }),
  /email credential key is not active/,
)
assert.equal(blockedRequestCount, 0)

let unsafeSenderRequestCount = 0
await assert.rejects(
  sendMailchimpTransactionalMessage({
    command,
    senderProfile: { ...senderProfile, fromAddress: 'Billing\r\nBcc: attacker@example.com <billing@billing.example.com>' },
    providerApiKeyEnvelope: credentialEnvelope,
    env,
    fetchImpl: async () => {
      unsafeSenderRequestCount += 1
      return new Response('{}')
    },
  }),
  /sender_profile_from_invalid/,
)
assert.equal(unsafeSenderRequestCount, 0)

console.log('mailchimp-transactional-client.test: PASS (MAIL-12 server adapter)')
