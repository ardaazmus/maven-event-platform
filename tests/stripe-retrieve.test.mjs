import assert from 'node:assert'
import { retrieveStripePayment } from '../src/lib/stripe-retrieve.ts'

const secretKey = 'sk_test_example'
let request
const success = await retrieveStripePayment({
  secretKey,
  mode: 'test',
  paymentIntentId: 'pi_123',
  fetchImpl: async (url, init) => {
    request = { url, init }
    return { ok: true, status: 200, json: async () => ({ id: 'pi_123', status: 'succeeded', amount: 50000, currency: 'try', client_secret: 'must-not-escape' }) }
  },
})
assert.deepEqual(success, { ok: true, providerPaymentId: 'pi_123', status: 'succeeded', amountMinor: 50000, currency: 'TRY' })
assert.equal(request.url, 'https://api.stripe.com/v1/payment_intents/pi_123')
assert.equal(request.init.method, 'GET')
assert.equal(request.init.redirect, 'error', 'Stripe retrieve must fail closed on redirects before credentials can leave the provider origin')
assert.equal(request.init.headers['Stripe-Version'], '2026-02-25.clover', 'Stripe retrieve must use an explicit pinned API version')
assert(request.init.headers.Authorization.startsWith('Basic '), 'Stripe secret must be sent server-side as auth, not query string')
assert(!request.url.includes(secretKey), 'Stripe secret must never be placed in the URL')

const processing = await retrieveStripePayment({
  secretKey,
  mode: 'test',
  paymentIntentId: 'pi_123',
  fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ id: 'pi_123', status: 'processing', amount: 50000, currency: 'try' }) }),
})
assert.equal(processing.ok && processing.status, 'processing')

for (const [status, expected] of [[401, 'configuration'], [404, 'not_found'], [429, 'rate_limited'], [503, 'unavailable']]) {
  const result = await retrieveStripePayment({ secretKey, mode: 'test', paymentIntentId: 'pi_123', fetchImpl: async () => ({ ok: false, status, json: async () => ({}) }) })
  assert.equal(result.ok, false)
  assert.equal(result.category, expected)
}

assert.deepEqual(await retrieveStripePayment({ secretKey: 'sk_live_example', mode: 'test', paymentIntentId: 'pi_123', fetchImpl: async () => { throw new Error('must not call') } }), { ok: false, category: 'configuration', code: 'stripe_key_mode_mismatch' })
assert.deepEqual(await retrieveStripePayment({ secretKey, mode: 'test', paymentIntentId: 'ch_123', fetchImpl: async () => { throw new Error('must not call') } }), { ok: false, category: 'configuration', code: 'stripe_payment_intent_id_invalid' })
assert.deepEqual(await retrieveStripePayment({ secretKey, mode: 'test', paymentIntentId: 'pi_123', fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ id: 'pi_123', status: 'requires_payment_method', amount: 50000, currency: 'try' }) }) }), { ok: false, category: 'unknown', code: 'stripe_response_contract_invalid' })

for (const timeoutMs of [0, 249, 30_001, Number.NaN, Number.POSITIVE_INFINITY]) {
  let called = false
  const result = await retrieveStripePayment({
    secretKey,
    mode: 'test',
    paymentIntentId: 'pi_123',
    timeoutMs,
    fetchImpl: async () => {
      called = true
      throw new Error('must not call with invalid timeout')
    },
  })
  assert.deepEqual(result, { ok: false, category: 'configuration', code: 'stripe_timeout_invalid' })
  assert.equal(called, false)
}

console.log('stripe-retrieve.test: PASS (PAY-06D-50)')
