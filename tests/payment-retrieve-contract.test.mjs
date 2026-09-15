import assert from 'node:assert'
import { normalizeProviderRetrieveResult } from '../src/lib/payment-retrieve-contract.ts'

assert.deepEqual(normalizeProviderRetrieveResult('iyzico', {
  ok: true,
  providerPaymentId: 'token_123456',
  status: 'succeeded',
  amountMinor: 12_500,
  currency: 'try',
  clientSecret: 'must-not-escape',
}), {
  ok: true,
  provider: 'iyzico',
  providerPaymentId: 'token_123456',
  status: 'succeeded',
  amountMinor: 12_500,
  currency: 'TRY',
})

assert.deepEqual(normalizeProviderRetrieveResult('stripe', {
  ok: true,
  providerPaymentId: 'pi_123456',
  status: 'processing',
  amountMinor: 500,
  currency: 'USD',
}), {
  ok: true,
  provider: 'stripe',
  providerPaymentId: 'pi_123456',
  status: 'processing',
  amountMinor: 500,
  currency: 'USD',
})

assert.deepEqual(normalizeProviderRetrieveResult('iyzico', {
  ok: false,
  category: 'rate_limited',
  code: 'iyzico_rate_limited',
}), { ok: false, provider: 'iyzico', category: 'rate_limited', code: 'iyzico_rate_limited' })

assert.deepEqual(normalizeProviderRetrieveResult('iyzico', {
  ok: true,
  providerPaymentId: 'token_123456',
  status: 'created',
  amountMinor: 100,
  currency: 'TRY',
}), { ok: false, provider: 'iyzico', category: 'unknown', code: 'provider_retrieve_response_invalid' })

for (const value of [
  { ok: true, providerPaymentId: 'token_123456', status: 'succeeded', amountMinor: -1, currency: 'TRY' },
  { ok: true, providerPaymentId: 'token_123456', status: 'succeeded', amountMinor: 100, currency: 'TRY\n' },
  { ok: false, category: 'not-a-category', code: 'provider_error' },
  { ok: false, category: 'unknown', code: 'bad code' },
]) {
  assert.deepEqual(normalizeProviderRetrieveResult('iyzico', value), {
    ok: false,
    provider: 'iyzico',
    category: 'unknown',
    code: 'provider_retrieve_response_invalid',
  })
}

console.log('payment-retrieve-contract.test: PASS (PAY-06D-29)')
