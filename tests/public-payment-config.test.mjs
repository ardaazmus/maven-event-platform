import assert from 'node:assert'
import { containsForbiddenKeys, sanitizePublicForm } from '../src/lib/public-dto.ts'

const snapshot = sanitizePublicForm({
  slug: 'event-form',
  title: 'Event',
  description: null,
  status: 'published',
  settingsJson: '{}',
  fields: [],
  themes: [],
  appearance: null,
  paymentConfig: {
    enabled: true,
    provider: 'stripe',
    mode: 'live',
    connectionId: 'private-connection-id',
    credentialsEnvelope: 'private-credentials',
    pricingPolicyJson: JSON.stringify({
      type: 'fixed',
      amount: '125.50',
      currency: 'TRY',
      secretRef: 'must-not-leak',
    }),
  },
})

assert.deepStrictEqual(snapshot.payment, {
  enabled: true,
  provider: 'stripe',
  pricingPolicy: {
    type: 'fixed',
    amount: '125.50',
    currency: 'TRY',
  },
}, 'published snapshots must expose only the public payment policy')
assert(!JSON.stringify(snapshot).includes('private-connection-id'), 'connection id must not enter public snapshots')
assert(!JSON.stringify(snapshot).includes('private-credentials'), 'credential envelope must not enter public snapshots')
assert.deepStrictEqual(containsForbiddenKeys(snapshot), [], 'payment snapshot must pass the public forbidden-key scan')

const disabled = sanitizePublicForm({
  slug: 'free-form',
  title: 'Free',
  status: 'published',
  fields: [],
  paymentConfig: { enabled: false, provider: 'iyzico', pricingPolicyJson: '{}' },
})
assert.strictEqual(disabled.payment, null, 'disabled payment configuration must not advertise a payment action')

console.log('public-payment-config.test: PASS (PAY-06D-01)')
