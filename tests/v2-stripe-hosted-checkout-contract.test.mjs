import assert from 'node:assert/strict'
import { createStripeCheckoutSession } from '../src/lib/stripe-checkout.ts'

const fetchImpl = async () => new Response(JSON.stringify({
  id: 'cs_test_123',
  url: 'https://checkout.stripe.com/c/pay/test',
  status: 'open',
}), { status: 200 })

const base = {
  secretKey: 'sk_test_valid',
  mode: 'test',
  idempotencyKey: 'order_test_123456',
  currency: 'TRY',
  productName: 'Etkinlik kaydı',
  successUrl: 'http://localhost:3000/payment/success',
  cancelUrl: 'http://localhost:3000/payment/cancel',
  fetchImpl,
}

assert.deepEqual(await createStripeCheckoutSession({ ...base, amountMinor: 2_147_483_647 }), {
  ok: true,
  sessionId: 'cs_test_123',
  url: 'https://checkout.stripe.com/c/pay/test',
  status: 'open',
})
assert.deepEqual(await createStripeCheckoutSession({ ...base, amountMinor: 2_147_483_648 }), {
  ok: false,
  category: 'validation',
  code: 'stripe_checkout_amount_invalid',
})

console.log('v2-stripe-hosted-checkout-contract.test: PASS')
