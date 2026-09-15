import assert from 'node:assert'
import {
  buildMailchimpTransactionalSignature,
  normalizeMailchimpTransactionalWebhook,
  verifyMailchimpTransactionalWebhookSignature,
} from '../src/lib/mailchimp-webhook.ts'

const webhookUrl = 'https://app.example.com/api/webhooks/email/mailchimp?workspace=ws_1'
const webhookKey = 'mailchimp-webhook-key'
const events = [
  { _id: 'evt-delivered', event: 'delivered', msg: { _id: 'msg-delivered', email: 'Person@example.com' } },
  { _id: 'evt-bounce', event: 'hard_bounce', msg: { email: 'bounce@example.com' } },
  { _id: 'evt-soft', event: 'soft_bounce', msg: { email: 'soft@example.com' } },
  { _id: 'evt-complaint', event: 'spam', msg: { email: 'spam@example.com' } },
  { _id: 'evt-unsubscribe', event: 'unsub', msg: { email: 'optout@example.com' } },
  { _id: 'evt-ignored', event: 'open', msg: { email: 'open@example.com' } },
]
const params = { mandrill_events: JSON.stringify(events) }
const signature = buildMailchimpTransactionalSignature(webhookUrl, params, webhookKey)

assert.equal(
  verifyMailchimpTransactionalWebhookSignature(webhookUrl, params, signature, webhookKey),
  true,
  'valid Mailchimp Transactional signature must pass',
)
assert.equal(
  verifyMailchimpTransactionalWebhookSignature(webhookUrl, { ...params, extra: 'changed' }, signature, webhookKey),
  false,
  'changed signed parameters must fail',
)
assert.equal(
  verifyMailchimpTransactionalWebhookSignature(webhookUrl, params, signature, 'wrong-key'),
  false,
  'wrong webhook key must fail',
)

const accepted = normalizeMailchimpTransactionalWebhook({
  workspaceId: 'ws_1',
  webhookUrl,
  params,
  signatureHeader: signature,
  webhookKey,
  payloadHash: 'sha256:payload-1',
})

assert.equal(accepted.signatureVerified, true)
assert.equal(accepted.events.length, 5, 'unsupported open event must not change delivery state')
assert.deepEqual(accepted.events[0], {
  event: {
    provider: 'mailchimp_transactional',
    externalEventId: 'evt-delivered',
    providerMessageId: 'msg-delivered',
    eventType: 'delivered',
    recipientEmail: 'person@example.com',
    payloadHash: 'sha256:payload-1',
    signatureVerified: true,
  },
  dedupeKey: 'ws_1:mailchimp_transactional:evt-delivered',
})
assert.equal(accepted.events[1].event.eventType, 'bounce')
assert.equal(accepted.events[2].event.eventType, 'reject')
assert.equal(accepted.events[3].event.eventType, 'complaint')
assert.equal(accepted.events[4].event.eventType, 'unsubscribe')

const duplicateBatch = normalizeMailchimpTransactionalWebhook({
  workspaceId: 'ws_1',
  webhookUrl,
  params: { mandrill_events: JSON.stringify([events[0], events[0]]) },
  signatureHeader: buildMailchimpTransactionalSignature(webhookUrl, { mandrill_events: JSON.stringify([events[0], events[0]]) }, webhookKey),
  webhookKey,
  payloadHash: 'sha256:payload-2',
})
assert.equal(duplicateBatch.events.length, 1, 'duplicate provider event IDs must be collapsed in one batch')

assert.throws(
  () => normalizeMailchimpTransactionalWebhook({
    workspaceId: 'ws_1', webhookUrl, params, signatureHeader: 'invalid', webhookKey, payloadHash: 'hash',
  }),
  /webhook_signature_invalid/,
)
assert.throws(
  () => normalizeMailchimpTransactionalWebhook({
    workspaceId: 'ws_1', webhookUrl, params: { mandrill_events: '{' }, signatureHeader: 'invalid', webhookKey, payloadHash: 'hash',
  }),
  /webhook_signature_invalid/,
  'invalid signatures must be rejected before payload parsing',
)

console.log('mailchimp-webhook.test: PASS (MAIL-13)')
