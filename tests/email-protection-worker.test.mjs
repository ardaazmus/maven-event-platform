import assert from 'node:assert'
import { normalizeEmailProviderEvent } from '../src/lib/email-provider-event.ts'
import { decideEmailProtection } from '../src/lib/email-protection.ts'
import { buildEmailProtectionPersistencePlan } from '../src/lib/email-protection-worker.ts'

const event = normalizeEmailProviderEvent({
  provider: 'mailchimp_transactional',
  externalEventId: 'evt-complaint',
  eventType: 'complaint',
  recipientEmail: 'Person@example.com',
  payloadHash: 'sha256:payload',
  signatureVerified: true,
})
const decision = decideEmailProtection(event)
const plan = buildEmailProtectionPersistencePlan({
  workspaceId: 'ws_1',
  eventId: 'db_evt_1',
  event,
  decision,
}, 'hash-secret-for-tests')

assert.deepEqual(plan.suppression, {
  workspaceId: 'ws_1',
  recipientHash: '774cb77f2731f600b625e26790790fc7ea450f9d768425381237aadc3b30d1af',
  reason: 'complaint',
  scope: 'all',
  sourceProvider: 'mailchimp_transactional',
  sourceEventId: 'evt-complaint',
})
assert.deepEqual(plan.workspaceProtection, {
  workspaceId: 'ws_1',
  marketingPaused: true,
  pauseReason: 'complaint',
})
assert.deepEqual(plan.audit, {
  action: 'email.protection.alert',
  resourceType: 'email_provider_event',
  resourceId: 'db_evt_1',
  afterJson: '{"alert":"complaint","eventType":"complaint"}',
})
assert.equal(JSON.stringify(plan).includes('person@example.com'), false, 'persistence plan must not contain plaintext recipient email')
assert.throws(
  () => buildEmailProtectionPersistencePlan({ workspaceId: 'ws_1', eventId: 'db_evt_1', event, decision }, ''),
  /suppression_hash_secret_required/,
)

console.log('email-protection-worker.test: PASS (MAIL-14B)')
