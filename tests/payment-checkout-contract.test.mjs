import assert from 'node:assert'
import { normalizeProviderCheckoutResult } from '../src/lib/payment-checkout-contract.ts'

assert.deepEqual(normalizeProviderCheckoutResult('iyzico', {
  providerReference: 'pay_123',
  redirectUrl: 'https://iyzico.example/checkout/123',
  status: 'requires_action',
}), {
  ok: true,
  provider: 'iyzico',
  providerReference: 'pay_123',
  redirectUrl: 'https://iyzico.example/checkout/123',
  status: 'requires_action',
})

assert.deepEqual(normalizeProviderCheckoutResult('stripe', {
  providerReference: 'cs_test_123',
  redirectUrl: 'https://checkout.stripe.com/c/pay/test',
  status: 'open',
  secretKey: 'must-not-cross-adapter-boundary',
}), { ok: false, category: 'unknown', code: 'checkout_response_forbidden' })

assert.deepEqual(normalizeProviderCheckoutResult('stripe', {
  providerReference: 'cs_test_123',
  redirectUrl: 'https://checkout.stripe.com/c/pay/test',
  status: 'open',
  providerPayload: { credentials: { apiKey: 'must-not-cross-adapter-boundary' } },
}), { ok: false, category: 'unknown', code: 'checkout_response_forbidden' })

assert.deepEqual(normalizeProviderCheckoutResult('stripe', {
  providerReference: 'cs_test_123',
  redirectUrl: 'http://localhost:3000/payment',
  status: 'open',
}), { ok: false, category: 'validation', code: 'checkout_response_url_invalid' })

console.log('payment-checkout-contract.test: PASS (PAY-06D-03)')
