import assert from 'node:assert'
import {
  PAYMENT_FAILURE_CATEGORIES,
  PAYMENT_PROVIDER_ADAPTER_METHODS,
  isPaymentProviderAdapter,
  isPaymentProvider,
  normalizeProviderFailure,
} from '../src/lib/payment-provider-contract.ts'

assert.deepEqual(PAYMENT_FAILURE_CATEGORIES, [
  'declined',
  'requires_action',
  'configuration',
  'rate_limited',
  'unavailable',
  'unknown',
])

assert.equal(isPaymentProvider('stripe'), true)
assert.equal(isPaymentProvider('iyzico'), true)
assert.equal(isPaymentProvider('paypal'), false)

assert.equal(normalizeProviderFailure('declined'), 'declined')
assert.equal(normalizeProviderFailure('requires_action'), 'requires_action')
assert.equal(normalizeProviderFailure('provider leaked secret'), 'unknown')
assert.equal(normalizeProviderFailure(null), 'unknown')

assert.deepEqual(PAYMENT_PROVIDER_ADAPTER_METHODS, [
  'validateConnection',
  'createCheckout',
  'retrievePayment',
  'verifyWebhook',
  'refund',
])

const adapter = Object.fromEntries(PAYMENT_PROVIDER_ADAPTER_METHODS.map((method) => [method, () => Promise.resolve(null)]))
assert.equal(isPaymentProviderAdapter({ provider: 'stripe', ...adapter }), true)
assert.equal(isPaymentProviderAdapter({ provider: 'paypal', ...adapter }), false)
assert.equal(isPaymentProviderAdapter({ provider: 'stripe', ...adapter, refund: undefined }), false)
assert.equal(isPaymentProviderAdapter({ provider: 'stripe', ...adapter, secretKey: 'must-not-be-part-of-contract' }), false)

console.log('payment-provider-contract.test: PASS (PAY-05B)')
