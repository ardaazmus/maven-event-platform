import assert from 'node:assert'
import { canEnqueueEmail } from '../src/lib/email-consent.ts'
import {
  isEmailSuppressedForMessage,
  normalizeEmailSuppression,
} from '../src/lib/email-suppression.ts'

const hardBounce = normalizeEmailSuppression({ email: ' Person@Example.COM ', reason: 'hard_bounce' })
assert.deepEqual(hardBounce, {
  email: 'person@example.com',
  reason: 'hard_bounce',
  scope: 'all',
})
assert.equal(isEmailSuppressedForMessage('person@example.com', [hardBounce], 'transactional'), true)

const unsubscribe = normalizeEmailSuppression({ email: 'person@example.com', reason: 'unsubscribe' })
assert.equal(isEmailSuppressedForMessage('person@example.com', [unsubscribe], 'marketing'), true)
assert.equal(isEmailSuppressedForMessage('person@example.com', [unsubscribe], 'notification'), false)
assert.equal(isEmailSuppressedForMessage('person@example.com', [unsubscribe], 'transactional'), false)

const manualBlock = normalizeEmailSuppression({ email: 'person@example.com', reason: 'manual_block', scope: 'marketing' })
assert.equal(isEmailSuppressedForMessage('person@example.com', [manualBlock], 'marketing'), true)
assert.equal(isEmailSuppressedForMessage('person@example.com', [manualBlock], 'transactional'), false)
assert.equal(canEnqueueEmail({
  messageClass: 'marketing',
  consentState: 'granted',
  suppressed: false,
  email: 'person@example.com',
  suppressions: [manualBlock],
}), false)

assert.throws(() => normalizeEmailSuppression({ email: 'not-an-email', reason: 'complaint' }), /invalid email/)
assert.throws(() => normalizeEmailSuppression({ email: 'person@example.com', reason: 'soft_bounce' }), /invalid suppression reason/)

console.log('email-suppression.test: PASS (MAIL-05)')
