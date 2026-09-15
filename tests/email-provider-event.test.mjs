import assert from 'node:assert'
import { readFileSync } from 'node:fs'
import {
  emailProviderEventDedupeKey,
  normalizeEmailProviderEvent,
} from '../src/lib/email-provider-event.ts'

const event = normalizeEmailProviderEvent({
  provider: 'Mailchimp',
  externalEventId: 'evt_123',
  eventType: 'bounce',
  providerMessageId: 'msg_123',
  recipientEmail: ' Person@Example.COM ',
  payloadHash: 'sha256:abc123',
  signatureVerified: true,
})

assert.deepEqual(event, {
  provider: 'mailchimp',
  externalEventId: 'evt_123',
  providerMessageId: 'msg_123',
  eventType: 'bounce',
  recipientEmail: 'person@example.com',
  payloadHash: 'sha256:abc123',
  signatureVerified: true,
})
assert.equal(emailProviderEventDedupeKey('workspace-1', event), 'workspace-1:mailchimp:evt_123')
assert.throws(() => normalizeEmailProviderEvent({ ...event, eventType: 'soft_bounce' }), /invalid email provider event type/)
assert.throws(() => normalizeEmailProviderEvent({ ...event, signatureVerified: false }), /signature must be verified/)

const schema = readFileSync('prisma/schema.prisma', 'utf8')
const migration = readFileSync('prisma/migrations/20260903200000_add_email_provider_event_inbox/migration.sql', 'utf8')
const model = schema.slice(schema.indexOf('model EmailProviderEvent {'), schema.indexOf('model WorkspaceBranding {'))
assert(model.includes('payloadHash'), 'email event inbox must store a payload hash')
assert(model.includes('providerMessageId'), 'email event inbox must retain provider message identity for correlation')
assert(/signatureVerified\s+Boolean\s+@default\(false\)/.test(model), 'email event signature state must be explicit')
assert(model.includes('@@unique([workspaceId, provider, externalEventId])'), 'email event delivery must be idempotent per workspace/provider')
assert(!model.includes('rawPayload') && !model.includes('payloadJson'), 'raw provider payload must not be persisted')
assert(migration.includes('EmailProviderEvent_workspaceId_provider_externalEventId_key'), 'email event idempotency must exist in migration')

console.log('email-provider-event.test: PASS (MAIL-06)')
