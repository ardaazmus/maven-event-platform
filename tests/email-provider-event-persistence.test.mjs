import assert from 'node:assert'
import { buildEmailProviderEventCreateData, normalizeEmailProviderEvent } from '../src/lib/email-provider-event.ts'

const event = normalizeEmailProviderEvent({
  provider: 'mailchimp_transactional',
  externalEventId: 'evt_123',
  providerMessageId: 'msg_123',
  eventType: 'delivered',
  recipientEmail: 'person@example.com',
  payloadHash: 'sha256:payload',
  signatureVerified: true,
})

assert.deepEqual(buildEmailProviderEventCreateData(' ws_1 ', event), {
  workspaceId: 'ws_1',
  provider: 'mailchimp_transactional',
  externalEventId: 'evt_123',
  providerMessageId: 'msg_123',
  eventType: 'delivered',
  recipientEmail: 'person@example.com',
  payloadHash: 'sha256:payload',
  signatureVerified: true,
})
assert.throws(() => buildEmailProviderEventCreateData('', event), /workspace id is required/)

const eventWithoutMessageId = normalizeEmailProviderEvent({ ...event, providerMessageId: undefined })
assert.deepEqual(buildEmailProviderEventCreateData('ws_1', eventWithoutMessageId), {
  workspaceId: 'ws_1',
  provider: 'mailchimp_transactional',
  externalEventId: 'evt_123',
  providerMessageId: null,
  eventType: 'delivered',
  recipientEmail: 'person@example.com',
  payloadHash: 'sha256:payload',
  signatureVerified: true,
})

console.log('email-provider-event-persistence.test: PASS (MAIL-13A)')
