import assert from 'node:assert/strict'
import { normalizeProviderRetrieveResult } from '../src/lib/payment-retrieve-contract.ts'
import { decideRetrievedPaymentTransition } from '../src/lib/payment-retrieve-reconciliation.ts'

const valid = normalizeProviderRetrieveResult('stripe', {
  ok: true,
  providerPaymentId: 'pi_123456',
  status: 'succeeded',
  amountMinor: 2_147_483_647,
  currency: 'TRY',
})
assert.equal(valid.ok, true)

assert.deepEqual(normalizeProviderRetrieveResult('stripe', {
  ok: true,
  providerPaymentId: 'pi_123456',
  status: 'succeeded',
  amountMinor: 2_147_483_648,
  currency: 'TRY',
}), {
  ok: false,
  provider: 'stripe',
  category: 'unknown',
  code: 'provider_retrieve_response_invalid',
})

const order = {
  provider: 'stripe',
  providerOrderId: 'pi_123456',
  amountMinor: 2_147_483_647,
  currency: 'TRY',
  status: 'processing',
}
assert.deepEqual(decideRetrievedPaymentTransition(order, valid), {
  ok: true,
  changed: true,
  status: 'succeeded',
})

const terminalOrder = { ...order, status: 'succeeded' }
assert.deepEqual(decideRetrievedPaymentTransition(terminalOrder, valid), {
  ok: true,
  changed: false,
  status: 'succeeded',
})

console.log('v2-payment-retrieve-state-fence.test: PASS')
