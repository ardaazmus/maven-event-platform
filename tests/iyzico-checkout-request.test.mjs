import assert from 'node:assert'
import { buildIyzicoCheckoutFormRequest } from '../src/lib/iyzico-checkout-request.ts'

assert.deepEqual(buildIyzicoCheckoutFormRequest({
  order: {
    workspaceId: 'ws_123', formId: 'form_123', publishedVersionId: 'version_123',
    provider: 'iyzico', mode: 'test', idempotencyKey: 'order_test_123456', amountMinor: 12550, currency: 'TRY',
  },
  basketId: 'basket_123',
  productName: 'Etkinlik kaydı',
  callbackUrl: 'https://forms.example.test/payment/callback',
  buyer: {
    id: 'buyer_123', name: 'Ada', surname: 'Test', email: 'ada@example.test',
    gsmNumber: '+905551112233', country: 'Turkey', city: 'Istanbul', zipCode: '34000',
  },
}), {
  ok: true,
  request: {
    locale: 'tr',
    conversationId: 'order_test_123456',
    price: '125.50',
    paidPrice: '125.50',
    currency: 'TRY',
    basketId: 'basket_123',
    paymentGroup: 'PRODUCT',
    callbackUrl: 'https://forms.example.test/payment/callback',
    basketItems: [{ id: 'basket_123', name: 'Etkinlik kaydı', category1: 'Form', itemType: 'VIRTUAL', price: '125.50' }],
    buyer: {
      id: 'buyer_123', name: 'Ada', surname: 'Test', email: 'ada@example.test',
      gsmNumber: '+905551112233', country: 'Turkey', city: 'Istanbul', zipCode: '34000',
    },
  },
})

assert.deepEqual(buildIyzicoCheckoutFormRequest({
  order: { provider: 'iyzico', mode: 'test', idempotencyKey: 'order_test_123456', amountMinor: 100, currency: 'TRY' },
  basketId: 'basket_123', productName: 'x', callbackUrl: 'https://forms.example.test/callback',
  buyer: { id: 'buyer_123', name: 'Ada', surname: 'Test', email: 'ada@example.test', cardNumber: '4111111111111111' },
}), { ok: false, reason: 'buyer_invalid' })

assert.deepEqual(buildIyzicoCheckoutFormRequest({
  order: { provider: 'stripe', mode: 'test', idempotencyKey: 'order_test_123456', amountMinor: 1, currency: 'TRY' },
  basketId: 'basket_123', productName: 'x', callbackUrl: 'https://forms.example.test/callback',
}), { ok: false, reason: 'provider_invalid' })

assert.deepEqual(buildIyzicoCheckoutFormRequest({
  order: { provider: 'iyzico', mode: 'live', idempotencyKey: 'order_live_123456', amountMinor: 100, currency: 'TRY' },
  basketId: 'basket_123', productName: 'x', callbackUrl: 'http://localhost:3000/callback',
}), { ok: false, reason: 'callback_url_invalid' })

console.log('iyzico-checkout-request.test: PASS (PAY-06D-13)')
