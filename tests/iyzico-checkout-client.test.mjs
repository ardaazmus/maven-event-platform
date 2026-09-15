import assert from 'node:assert'
import { initializeIyzicoCheckoutForm } from '../src/lib/iyzico-checkout-client.ts'

let captured
const success = await initializeIyzicoCheckoutForm({
  mode: 'test',
  baseUrl: 'https://sandbox-api.iyzipay.com',
  credentials: { apiKey: 'api-key', secretKey: 'secret-key' },
  request: { locale: 'tr', conversationId: 'order_test_123456', price: '125.50', paidPrice: '125.50', currency: 'TRY', callbackUrl: 'https://forms.example.test/callback' },
  randomKey: '123456789',
  fetchImpl: async (url, init) => {
    captured = { url, init }
    return new Response(JSON.stringify({ status: 'success', token: 'token_123', paymentPageUrl: 'https://sandbox-cpp.iyzico.com/checkout?token=token_123', signature: 'provider-signature' }), { status: 200 })
  },
})
assert.deepEqual(success, { ok: true, token: 'token_123', paymentPageUrl: 'https://sandbox-cpp.iyzico.com/checkout?token=token_123', status: 'success' })
assert.equal(captured.url, 'https://sandbox-api.iyzipay.com/payment/iyzipos/checkoutform/initialize/auth/ecom')
assert.equal(captured.init.headers.Authorization.startsWith('IYZWSv2 '), true)
assert.equal(captured.init.headers['x-iyzi-rnd'], '123456789')
assert.equal(captured.init.headers['Content-Type'], 'application/json')
assert.equal(JSON.parse(captured.init.body).price, '125.50')

assert.deepEqual(await initializeIyzicoCheckoutForm({
  mode: 'live', baseUrl: 'https://sandbox-api.iyzipay.com', credentials: { apiKey: 'api-key', secretKey: 'secret-key' }, request: {}, fetchImpl: async () => { throw new Error('must not call wrong environment') },
}), { ok: false, category: 'configuration', code: 'iyzico_base_url_mode_mismatch' })

assert.deepEqual(await initializeIyzicoCheckoutForm({
  mode: 'test', baseUrl: 'https://sandbox-api.iyzipay.com', credentials: { apiKey: 'api-key', secretKey: 'secret-key' }, request: {}, fetchImpl: async () => new Response(JSON.stringify({ status: 'success', token: 'token_123' }), { status: 200 }),
}), { ok: false, category: 'unknown', code: 'iyzico_checkout_response_contract_invalid' })

console.log('iyzico-checkout-client.test: PASS (PAY-06D-10)')
