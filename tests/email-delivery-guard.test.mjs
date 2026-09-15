import assert from 'node:assert'
import { evaluateQueuedEmailDelivery, extractQueuedEmailRecipient } from '../src/lib/email-delivery-guard.ts'

assert.deepEqual(evaluateQueuedEmailDelivery({
  messageClass: 'marketing',
  suppressionScopes: [],
  marketingPaused: true,
}), { status: 'blocked', reason: 'marketing_paused' })

assert.deepEqual(evaluateQueuedEmailDelivery({
  messageClass: 'transactional',
  suppressionScopes: ['all'],
  marketingPaused: false,
}), { status: 'blocked', reason: 'recipient_suppressed' })

assert.deepEqual(evaluateQueuedEmailDelivery({
  messageClass: 'marketing',
  suppressionScopes: ['marketing'],
  marketingPaused: false,
}), { status: 'blocked', reason: 'recipient_suppressed' })

assert.deepEqual(evaluateQueuedEmailDelivery({
  messageClass: 'transactional',
  suppressionScopes: ['marketing'],
  marketingPaused: true,
}), { status: 'allowed' })

assert.deepEqual(evaluateQueuedEmailDelivery({
  messageClass: 'notification',
  suppressionScopes: [],
  marketingPaused: true,
}), { status: 'allowed' })

assert.equal(extractQueuedEmailRecipient(JSON.stringify({ recipientEmail: ' Person@example.com ' })), 'person@example.com')
assert.equal(extractQueuedEmailRecipient(JSON.stringify({ formId: 'form-1' })), null)
assert.throws(() => extractQueuedEmailRecipient(JSON.stringify({ recipientEmail: '' })), /queued_email_recipient_invalid/)
assert.throws(() => extractQueuedEmailRecipient('{'), /queued_email_payload_invalid/)

console.log('email-delivery-guard.test: PASS (MAIL-14C)')
