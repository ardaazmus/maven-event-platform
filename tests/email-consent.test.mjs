import assert from 'node:assert'
import { canEnqueueEmail, normalizeConsentState } from '../src/lib/email-consent.ts'

assert.equal(normalizeConsentState(' granted '), 'granted')
assert.equal(normalizeConsentState('REVOKED'), 'revoked')
assert.equal(normalizeConsentState('unknown'), 'unknown')
assert.equal(normalizeConsentState('suppressed'), 'suppressed')
assert.equal(normalizeConsentState('invalid'), null)

assert.equal(canEnqueueEmail({ messageClass: 'transactional', consentState: 'unknown', suppressed: false }), true)
assert.equal(canEnqueueEmail({ messageClass: 'notification', consentState: 'unknown', suppressed: false }), true)
assert.equal(canEnqueueEmail({ messageClass: 'marketing', consentState: 'granted', suppressed: false }), true)
assert.equal(canEnqueueEmail({ messageClass: 'marketing', consentState: 'unknown', suppressed: false }), false)
assert.equal(canEnqueueEmail({ messageClass: 'marketing', consentState: 'revoked', suppressed: false }), false)
assert.equal(canEnqueueEmail({ messageClass: 'transactional', consentState: 'granted', suppressed: true }), false)

console.log('email-consent.test: PASS (MAIL-02)')
