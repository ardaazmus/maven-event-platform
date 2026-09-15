import assert from 'node:assert'
import { buildPublicPaymentOrderSnapshot } from '../src/lib/payment-public-intent.ts'

const context = {
  workspaceId: 'ws_123',
  formId: 'form_123',
  publishedVersionId: 'version_123',
  mode: 'test',
  payment: {
    enabled: true,
    provider: 'stripe',
    pricingPolicy: { type: 'fixed', amount: '125.50', currency: 'TRY' },
  },
}

assert.deepStrictEqual(buildPublicPaymentOrderSnapshot(context, {
  idempotencyKey: 'order_public_123456',
  values: { amount: '0.01', provider: 'iyzico', mode: 'live' },
}), {
  ok: true,
  snapshot: {
    workspaceId: 'ws_123',
    formId: 'form_123',
    publishedVersionId: 'version_123',
    provider: 'stripe',
    mode: 'test',
    idempotencyKey: 'order_public_123456',
    amountMinor: 12550,
    currency: 'TRY',
  },
}, 'public payment intent must use only trusted published policy and server context')

assert.deepStrictEqual(buildPublicPaymentOrderSnapshot({
  ...context,
  payment: { enabled: false, provider: 'stripe', pricingPolicy: context.payment.pricingPolicy },
}, { idempotencyKey: 'order_public_123456', values: {} }), {
  ok: false,
  reason: 'payment_disabled',
})

assert.deepStrictEqual(buildPublicPaymentOrderSnapshot(context, {
  idempotencyKey: 'short',
  values: {},
}), { ok: false, reason: 'idempotency_key_invalid' })

console.log('payment-public-intent.test: PASS (PAY-06D-02)')
