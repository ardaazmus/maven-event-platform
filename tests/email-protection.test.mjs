import assert from 'node:assert'
import { normalizeEmailProviderEvent } from '../src/lib/email-provider-event.ts'
import { decideEmailProtection } from '../src/lib/email-protection.ts'

function event(eventType, recipientEmail = 'Person@example.com') {
  return normalizeEmailProviderEvent({
    provider: 'mailchimp_transactional',
    externalEventId: `evt-${eventType}`,
    eventType,
    recipientEmail,
    payloadHash: 'sha256:payload',
    signatureVerified: true,
  })
}

assert.deepEqual(decideEmailProtection(event('bounce')), {
  suppression: { email: 'person@example.com', reason: 'hard_bounce', scope: 'all' },
  stopRecipientRetry: true,
  pauseMarketing: false,
  adminAlert: 'hard_bounce',
})

assert.deepEqual(decideEmailProtection(event('complaint')), {
  suppression: { email: 'person@example.com', reason: 'complaint', scope: 'all' },
  stopRecipientRetry: true,
  pauseMarketing: true,
  adminAlert: 'complaint',
})

assert.deepEqual(decideEmailProtection(event('unsubscribe')), {
  suppression: { email: 'person@example.com', reason: 'unsubscribe', scope: 'marketing' },
  stopRecipientRetry: false,
  pauseMarketing: false,
  adminAlert: null,
})

assert.deepEqual(decideEmailProtection(event('delivered', null)), {
  suppression: null,
  stopRecipientRetry: false,
  pauseMarketing: false,
  adminAlert: null,
})

assert.deepEqual(decideEmailProtection(event('reject', null)), {
  suppression: null,
  stopRecipientRetry: false,
  pauseMarketing: false,
  adminAlert: null,
})

assert.throws(() => decideEmailProtection(event('bounce', null)), /recipient_required_for_protection/)
assert.throws(() => decideEmailProtection({ ...event('delivered'), signatureVerified: false }), /signature_not_verified/)

console.log('email-protection.test: PASS (MAIL-14)')
