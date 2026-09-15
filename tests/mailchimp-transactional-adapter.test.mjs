import assert from 'node:assert'
import { normalizeDomainHealth } from '../src/lib/email-domain-health.ts'
import { normalizeSenderProfile } from '../src/lib/email-sender-profile.ts'
import {
  mapMailchimpTransactionalResponse,
  prepareMailchimpTransactionalSend,
} from '../src/lib/mailchimp-transactional-adapter.ts'

const senderProfile = {
  ...normalizeSenderProfile({
    workspaceId: 'ws_1',
    messageClass: 'transactional',
    provider: 'mailchimp_transactional',
    sendingDomain: 'billing.example.com',
    fromAddress: 'Billing <billing@billing.example.com>',
  }),
  healthStatus: 'healthy',
  enabled: true,
}

const domainHealth = normalizeDomainHealth({
  domain: 'billing.example.com',
  spf: 'pass',
  dkim: 'pass',
  dmarc: 'pass',
  alignment: 'pass',
  tls: 'pass',
})

const baseInput = {
  workspaceId: 'ws_1',
  messageId: 'msg_1',
  messageClass: 'transactional',
  recipientEmail: 'Customer@example.com',
  subject: 'Faturanız hazır',
  textBody: 'Faturanız güvenli bağlantıdan görüntülenebilir.',
  appOrigin: 'https://app.example.com',
  senderProfile,
  domainHealth,
  providerApiKeyEnvelope: 'v1:key-1:iv:tag:ciphertext',
}

assert.deepEqual(
  prepareMailchimpTransactionalSend(baseInput),
  {
    status: 'ready',
    provider: 'mailchimp_transactional',
    action: 'send_message',
    workspaceId: 'ws_1',
    messageId: 'msg_1',
    messageClass: 'transactional',
    recipientEmail: 'customer@example.com',
    subject: 'Faturanız hazır',
    textBody: 'Faturanız güvenli bağlantıdan görüntülenebilir.',
    htmlBody: '<p>Faturanız güvenli bağlantıdan görüntülenebilir.</p>',
  },
  'healthy transactional email should produce a provider-safe send command',
)

assert.deepEqual(
  prepareMailchimpTransactionalSend({ ...baseInput, messageClass: 'marketing' }),
  { status: 'blocked', reason: 'message_class_invalid' },
)
assert.deepEqual(
  prepareMailchimpTransactionalSend({ ...baseInput, senderProfile: { ...senderProfile, enabled: false } }),
  { status: 'blocked', reason: 'sender_profile_unhealthy' },
)
assert.deepEqual(
  prepareMailchimpTransactionalSend({ ...baseInput, domainHealth: normalizeDomainHealth({ ...domainHealth, dkim: 'pending' }) }),
  { status: 'blocked', reason: 'domain_unhealthy' },
)
assert.deepEqual(
  prepareMailchimpTransactionalSend({ ...baseInput, providerApiKeyEnvelope: '' }),
  { status: 'blocked', reason: 'secret_not_ready' },
)

assert.deepEqual(
  mapMailchimpTransactionalResponse({ providerStatus: 'sent', providerMessageId: 'tx_123' }),
  { sendStatus: 'accepted', deliveryStatus: 'pending', providerMessageId: 'tx_123' },
  'provider acceptance must remain distinct from delivery',
)
assert.deepEqual(
  mapMailchimpTransactionalResponse({ providerStatus: 'rejected', providerMessageId: null }),
  { sendStatus: 'rejected', deliveryStatus: 'not_delivered', reason: 'rejected' },
)
assert.throws(
  () => mapMailchimpTransactionalResponse({ providerStatus: 'sent', providerMessageId: '' }),
  /provider_message_id_invalid/,
)
assert.equal('providerApiKeyEnvelope' in prepareMailchimpTransactionalSend(baseInput), false)

console.log('mailchimp-transactional-adapter.test: PASS (MAIL-12)')
