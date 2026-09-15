import assert from 'node:assert'
import { createStripeCheckoutSession } from '../src/lib/stripe-checkout.ts'

const calls = []
const fetchImpl = async (url, init) => {
  calls.push({ url, init })
  return new Response(JSON.stringify({ id: 'cs_test_123', url: 'https://checkout.stripe.com/c/pay/test', status: 'open', secret: 'must-not-leak' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

const success = await createStripeCheckoutSession({
  secretKey: 'sk_test_valid',
  mode: 'test',
  idempotencyKey: 'order_test_123456',
  amountMinor: 12500,
  currency: 'TRY',
  productName: 'Etkinlik kaydı',
  successUrl: 'http://localhost:3000/payment/success',
  cancelUrl: 'http://localhost:3000/payment/cancel',
  metadata: { order_id: 'order_123' },
  fetchImpl,
})
assert.deepEqual(success, { ok: true, sessionId: 'cs_test_123', url: 'https://checkout.stripe.com/c/pay/test', status: 'open' })
assert.equal(calls.length, 1)
assert.equal(calls[0].url, 'https://api.stripe.com/v1/checkout/sessions')
assert.equal(calls[0].init.headers['Idempotency-Key'], 'order_test_123456')
assert.equal(calls[0].init.headers['Stripe-Version'], '2026-02-25.clover')
const body = new URLSearchParams(calls[0].init.body)
assert.equal(body.get('line_items[0][price_data][unit_amount]'), '12500')
assert.equal(body.get('line_items[0][price_data][currency]'), 'try')
assert.equal(body.get('metadata[order_id]'), 'order_123')
assert.equal(Object.hasOwn(success, 'secret'), false)

assert.deepEqual(await createStripeCheckoutSession({
  secretKey: 'sk_live_valid', mode: 'test', idempotencyKey: 'order_test_123456', amountMinor: 1, currency: 'TRY', productName: 'x', successUrl: 'http://localhost:3000/s', cancelUrl: 'http://localhost:3000/c', fetchImpl,
}), { ok: false, category: 'configuration', code: 'stripe_key_mode_mismatch' })
assert.deepEqual(await createStripeCheckoutSession({
  secretKey: 'sk_test_valid', mode: 'test', idempotencyKey: 'order_test_123456', amountMinor: 0, currency: 'TRY', productName: 'x', successUrl: 'http://localhost:3000/s', cancelUrl: 'http://localhost:3000/c', fetchImpl,
}), { ok: false, category: 'validation', code: 'stripe_checkout_amount_invalid' })
assert.deepEqual(await createStripeCheckoutSession({
  secretKey: 'sk_test_valid', mode: 'test', idempotencyKey: 'order_test_123456', amountMinor: 1, currency: 'TRY', productName: 'x', successUrl: 'https://example.com/s', cancelUrl: 'https://example.com/c', fetchImpl,
}), { ok: true, sessionId: 'cs_test_123', url: 'https://checkout.stripe.com/c/pay/test', status: 'open' })
assert.deepEqual(await createStripeCheckoutSession({
  secretKey: 'sk_live_valid', mode: 'live', idempotencyKey: 'order_test_123456', amountMinor: 1, currency: 'TRY', productName: 'x', successUrl: 'http://localhost:3000/s', cancelUrl: 'https://example.com/c', fetchImpl,
}), { ok: false, category: 'validation', code: 'stripe_checkout_url_invalid' })

console.log('stripe-checkout.test: PASS (PAY-07B)')
