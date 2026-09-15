import assert from 'node:assert'
import { runPaymentRetrieveAdapter } from '../src/lib/payment-retrieve-port.ts'

let received
const adapter = {
  provider: 'iyzico',
  retrievePayment: async input => {
    received = input
    return { ok: true, providerPaymentId: 'token_123456', status: 'processing', amountMinor: 1_000, currency: 'TRY', secret: 'internal-only' }
  },
}

const result = await runPaymentRetrieveAdapter(adapter, {
  provider: 'iyzico',
  mode: 'test',
  providerPaymentId: 'token_123456',
  credentials: { apiKey: 'decrypted-only-at-server-boundary' },
})
assert.deepEqual(result, { ok: true, raw: { ok: true, providerPaymentId: 'token_123456', status: 'processing', amountMinor: 1_000, currency: 'TRY', secret: 'internal-only' } })
assert.deepEqual(received, {
  mode: 'test',
  providerPaymentId: 'token_123456',
  credentials: { apiKey: 'decrypted-only-at-server-boundary' },
})

assert.deepEqual(await runPaymentRetrieveAdapter({ ...adapter, provider: 'stripe' }, {
  provider: 'iyzico', mode: 'test', providerPaymentId: 'token_123456', credentials: {},
}), { ok: false, category: 'configuration', code: 'provider_adapter_mismatch' })
assert.deepEqual(await runPaymentRetrieveAdapter(adapter, {
  provider: 'iyzico', mode: 'live', providerPaymentId: 'bad id', credentials: {},
}), { ok: false, category: 'configuration', code: 'provider_retrieve_input_invalid' })

const failedAdapter = {
  ...adapter,
  retrievePayment: async () => { throw new Error('provider secret must not escape') },
}
assert.deepEqual(await runPaymentRetrieveAdapter(failedAdapter, {
  provider: 'iyzico', mode: 'test', providerPaymentId: 'token_123456', credentials: {},
}), { ok: false, category: 'unavailable', code: 'provider_retrieve_adapter_failed' })

console.log('payment-retrieve-port.test: PASS (PAY-06D-31)')
