import assert from 'node:assert'
import { classifyEmailEvent, requiresMarketingConsent } from '../src/lib/email-policy.ts'

assert.equal(classifyEmailEvent('invoice_ready'), 'transactional')
assert.equal(classifyEmailEvent('payment_receipt'), 'transactional')
assert.equal(classifyEmailEvent('form_confirmation'), 'notification')
assert.equal(classifyEmailEvent('admin_notification'), 'notification')
assert.equal(classifyEmailEvent('integration_alert'), 'notification')
assert.equal(classifyEmailEvent('marketing_campaign'), 'marketing')
assert.equal(requiresMarketingConsent('marketing'), true)
assert.equal(requiresMarketingConsent('transactional'), false)
assert.equal(requiresMarketingConsent('notification'), false)
assert.throws(() => classifyEmailEvent('unknown_event'), /email_event_classification_unknown/)

console.log('email-policy.test: PASS (MAIL-00)')
