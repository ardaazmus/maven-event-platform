import assert from 'node:assert'
import { encryptPaymentCredential } from '../src/lib/payment-credentials.ts'
import { initializeHostedIyzicoCheckout } from '../src/lib/iyzico-checkout-orchestration.ts'

const env = {
  MAVENFORMS_PAYMENT_ENCRYPTION_KEY: Buffer.alloc(32, 9).toString('base64url'),
  MAVENFORMS_PAYMENT_ENCRYPTION_KEY_ID: 'test-key-1',
}
const credentialsEnvelope = encryptPaymentCredential(JSON.stringify({ apiKey: 'api-key', secretKey: 'secret-key' }), env)
const order = { id: 'po_123', provider: 'iyzico', providerOrderId: null, status: 'created' }
const updates = []
const attempts = []
let capturedRequest
const tx = {
  paymentOrder: {
    findUnique: async () => order,
    update: async args => { updates.push(args); return { ...order, providerOrderId: 'token_123', status: 'requires_action' } },
  },
  paymentAttempt: {
    findFirst: async () => null,
    create: async args => { attempts.push(args); return { id: 'attempt_123', ...args.data } },
  },
}

const result = await initializeHostedIyzicoCheckout({
  connection: { provider: 'iyzico', mode: 'test', status: 'active', credentialsEnvelope },
  order: { provider: 'iyzico', mode: 'test', idempotencyKey: 'order_test_123456', amountMinor: 12550, currency: 'TRY' },
  paymentOrderId: 'po_123',
  basketId: 'basket_123',
  productName: 'Etkinlik kaydı',
  callbackUrl: 'https://forms.example.test/payment/callback',
  buyer: { id: 'buyer_123', name: 'Ada', surname: 'Test', email: 'ada@example.test' },
  randomKey: '123456789',
  env,
  tx,
  fetchImpl: async (_url, init) => {
    capturedRequest = JSON.parse(init.body)
    return new Response(JSON.stringify({ status: 'success', token: 'token_123', paymentPageUrl: 'https://sandbox-cpp.iyzico.com/checkout?token=token_123' }), { status: 200 })
  },
})

assert.deepEqual(result, {
  ok: true,
  redirectUrl: 'https://sandbox-cpp.iyzico.com/checkout?token=token_123',
  status: 'requires_action',
  reused: false,
})
assert.equal(capturedRequest.buyer.email, 'ada@example.test')
assert.equal('secretKey' in capturedRequest, false)
assert.deepEqual(updates[0], { where: { id: 'po_123' }, data: { providerOrderId: 'token_123', status: 'requires_action' } })
assert.equal(attempts.length, 1)

assert.deepEqual(await initializeHostedIyzicoCheckout({
  connection: { provider: 'iyzico', mode: 'test', status: 'draft', credentialsEnvelope },
  order: { provider: 'iyzico', mode: 'test', idempotencyKey: 'order_test_123456', amountMinor: 100, currency: 'TRY' },
  paymentOrderId: 'po_123', basketId: 'basket_123', productName: 'x', callbackUrl: 'https://forms.example.test/callback',
  buyer: { id: 'buyer_123', name: 'Ada', surname: 'Test', email: 'ada@example.test' }, env, tx,
  fetchImpl: async () => { throw new Error('must not call provider for invalid connection') },
}), { ok: false, reason: 'connection_invalid' })

console.log('iyzico-checkout-orchestration.test: PASS (PAY-06D-14)')
