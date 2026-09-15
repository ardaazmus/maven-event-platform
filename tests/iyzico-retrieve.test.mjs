import assert from 'node:assert'
import { createHmac } from 'node:crypto'
import { retrieveIyzicoCheckoutFormPayment } from '../src/lib/iyzico-retrieve.ts'

const credentials = { apiKey: 'api-key', secretKey: 'secret-key' }
const signedPayload = {
  status: 'success',
  paymentStatus: 'SUCCESS',
  fraudStatus: 1,
  paidPrice: '12.50',
  price: '12.50',
  currency: 'TRY',
  basketId: 'basket-123',
  conversationId: 'conversation-123',
  token: 'token_123',
  paymentId: '25168803',
}
const signedMessage = ['SUCCESS', '25168803', 'TRY', 'basket-123', 'conversation-123', '12.5', '12.5', 'token_123'].join(':')
const signedPayloadSignature = createHmac('sha256', credentials.secretKey).update(signedMessage).digest('hex')
let request
const success = await retrieveIyzicoCheckoutFormPayment({
  mode: 'test',
  baseUrl: 'https://sandbox-api.iyzipay.com',
  credentials,
  token: 'token_123',
  randomKey: 'random-key-123',
  fetchImpl: async (url, init) => {
    request = { url, init }
    return { ok: true, status: 200, json: async () => ({ status: 'success', paymentStatus: 'SUCCESS', fraudStatus: 1, paidPrice: '12.50', currency: 'TRY', token: 'token_123', paymentId: '25168803' }) }
  },
})
assert.deepEqual(success, { ok: true, providerPaymentId: 'token_123', status: 'succeeded', amountMinor: 1250, currency: 'TRY' })
assert.equal(request.url, 'https://sandbox-api.iyzipay.com/payment/iyzipos/checkoutform/auth/ecom/detail')
assert.equal(request.init.method, 'POST')
assert.equal(request.init.redirect, 'error')
assert.equal(request.init.headers['Content-Type'], 'application/json')
assert.equal(request.init.headers['x-iyzi-rnd'], 'random-key-123')
assert.deepEqual(JSON.parse(request.init.body), { locale: 'tr', token: 'token_123' })
assert(!request.init.headers.Authorization.includes('secret-key'), 'iyzico secret must not be sent in plaintext or response')

const signed = await retrieveIyzicoCheckoutFormPayment({
  mode: 'test',
  baseUrl: 'https://sandbox-api.iyzipay.com',
  credentials,
  token: 'token_123',
  conversationId: 'conversation-123',
  fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ ...signedPayload, signature: signedPayloadSignature }) }),
})
assert.equal(signed.ok, true)

const tampered = await retrieveIyzicoCheckoutFormPayment({
  mode: 'test',
  baseUrl: 'https://sandbox-api.iyzipay.com',
  credentials,
  token: 'token_123',
  conversationId: 'conversation-123',
  fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ ...signedPayload, signature: `${signedPayloadSignature.slice(0, -1)}${signedPayloadSignature.endsWith('0') ? '1' : '0'}` }) }),
})
assert.deepEqual(tampered, { ok: false, category: 'unknown', code: 'iyzico_retrieve_response_signature_invalid' })

const inReview = await retrieveIyzicoCheckoutFormPayment({
  mode: 'test',
  baseUrl: 'https://sandbox-api.iyzipay.com',
  credentials,
  token: 'token_123',
  fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ status: 'success', paymentStatus: 'SUCCESS', fraudStatus: 0, paidPrice: 12.5, currency: 'TRY', token: 'token_123' }) }),
})
assert.equal(inReview.ok && inReview.status, 'processing')

const failed = await retrieveIyzicoCheckoutFormPayment({
  mode: 'test',
  baseUrl: 'https://sandbox-api.iyzipay.com',
  credentials,
  token: 'token_123',
  fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ status: 'success', paymentStatus: 'FAILURE', fraudStatus: -1, paidPrice: '12.50', currency: 'TRY', token: 'token_123' }) }),
})
assert.equal(failed.ok && failed.status, 'failed')

assert.deepEqual(await retrieveIyzicoCheckoutFormPayment({
  mode: 'live',
  baseUrl: 'https://sandbox-api.iyzipay.com',
  credentials,
  token: 'token_123',
  fetchImpl: async () => { throw new Error('must not call wrong environment') },
}), { ok: false, category: 'configuration', code: 'iyzico_base_url_mode_mismatch' })

assert.deepEqual(await retrieveIyzicoCheckoutFormPayment({
  mode: 'test',
  baseUrl: 'https://sandbox-api.iyzipay.com',
  credentials,
  token: 'token_123',
  fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ status: 'success', paymentStatus: 'SUCCESS', paidPrice: '12.50', currency: 'TRY', token: 'token_123' }) }),
}), { ok: false, category: 'unknown', code: 'iyzico_retrieve_response_contract_invalid' })

console.log('iyzico-retrieve.test: PASS (PAY-06D-52)')
