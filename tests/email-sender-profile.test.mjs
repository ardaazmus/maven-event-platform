import assert from 'node:assert'
import { normalizeSenderProfile, senderProfileRequiresVerification } from '../src/lib/email-sender-profile.ts'

const profile = normalizeSenderProfile({
  workspaceId: 'ws_1',
  messageClass: 'transactional',
  provider: 'mailchimp_transactional',
  sendingDomain: ' Billing.Example.com ',
  fromAddress: 'Fatura <billing@example.com>',
  replyToAddress: 'support@example.com',
})

assert.deepEqual(profile, {
  workspaceId: 'ws_1',
  messageClass: 'transactional',
  provider: 'mailchimp_transactional',
  sendingDomain: 'billing.example.com',
  fromAddress: 'Fatura <billing@example.com>',
  replyToAddress: 'support@example.com',
  healthStatus: 'pending_verification',
  enabled: false,
})
assert.equal(senderProfileRequiresVerification(profile), true)
assert.throws(() => normalizeSenderProfile({ ...profile, sendingDomain: 'https://billing.example.com' }), /sender_profile_domain_invalid/)
assert.throws(() => normalizeSenderProfile({ ...profile, fromAddress: 'not-an-email' }), /sender_profile_from_invalid/)
assert.throws(() => normalizeSenderProfile({ ...profile, messageClass: 'unknown' }), /sender_profile_message_class_invalid/)

console.log('email-sender-profile.test: PASS (MAIL-01)')
