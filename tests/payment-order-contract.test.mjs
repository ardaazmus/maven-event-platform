import assert from 'node:assert'
import { validatePaymentOrderInput } from '../src/lib/payment-order-contract.ts'

assert.deepEqual(validatePaymentOrderInput({
  workspaceId: 'ws_123',
  formId: 'form_123',
  publishedVersionId: 'version_123',
  provider: 'stripe',
  mode: 'test',
  idempotencyKey: 'order_test_123456',
  serverAmountMinor: 12550,
  currency: 'try',
}), {
  ok: true,
  snapshot: {
    workspaceId: 'ws_123',
    formId: 'form_123',
    publishedVersionId: 'version_123',
    provider: 'stripe',
    mode: 'test',
    idempotencyKey: 'order_test_123456',
    amountMinor: 12550,
    currency: 'TRY',
  },
})

assert.deepEqual(validatePaymentOrderInput({
  workspaceId: 'ws_123',
  formId: 'form_123',
  publishedVersionId: 'version_123',
  provider: 'paypal',
  mode: 'test',
  idempotencyKey: 'order_test_123456',
  serverAmountMinor: 12550,
  currency: 'TRY',
}), { ok: false, reason: 'provider_invalid' })

assert.deepEqual(validatePaymentOrderInput({
  workspaceId: 'ws_123',
  formId: 'form_123',
  publishedVersionId: 'version_123',
  provider: 'stripe',
  mode: 'test',
  idempotencyKey: 'short',
  serverAmountMinor: 12550,
  currency: 'TRY',
}), { ok: false, reason: 'idempotency_key_invalid' })

assert.deepEqual(validatePaymentOrderInput({
  workspaceId: 'ws_123',
  formId: 'form_123',
  publishedVersionId: 'version_123',
  provider: 'stripe',
  mode: 'test',
  idempotencyKey: 'order_test_123456',
  serverAmountMinor: 12550,
  currency: 'TRY',
  clientAmount: 1,
}), { ok: false, reason: 'unexpected_client_amount' })

console.log('payment-order-contract.test: PASS (PAY-06A)')
