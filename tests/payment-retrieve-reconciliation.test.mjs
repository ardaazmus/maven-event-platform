import assert from 'node:assert'
import { normalizeProviderRetrieveResult } from '../src/lib/payment-retrieve-contract.ts'
import { decideRetrievedPaymentTransition } from '../src/lib/payment-retrieve-reconciliation.ts'

const order = {
  provider: 'iyzico',
  providerOrderId: 'token_123456',
  amountMinor: 12_500,
  currency: 'TRY',
  status: 'processing',
}

const succeeded = normalizeProviderRetrieveResult('iyzico', {
  ok: true,
  providerPaymentId: 'token_123456',
  status: 'succeeded',
  amountMinor: 12_500,
  currency: 'TRY',
})
assert.deepEqual(decideRetrievedPaymentTransition(order, succeeded), {
  ok: true,
  changed: true,
  status: 'succeeded',
})

const wrongAmount = normalizeProviderRetrieveResult('iyzico', {
  ok: true,
  providerPaymentId: 'token_123456',
  status: 'succeeded',
  amountMinor: 12_499,
  currency: 'TRY',
})
assert.deepEqual(decideRetrievedPaymentTransition(order, wrongAmount), { ok: false, reason: 'amount_mismatch' })

const wrongReference = normalizeProviderRetrieveResult('iyzico', {
  ok: true,
  providerPaymentId: 'token_other',
  status: 'succeeded',
  amountMinor: 12_500,
  currency: 'TRY',
})
assert.deepEqual(decideRetrievedPaymentTransition(order, wrongReference), { ok: false, reason: 'payment_id_mismatch' })

const failed = normalizeProviderRetrieveResult('iyzico', {
  ok: false,
  category: 'not_found',
  code: 'iyzico_payment_not_found',
})
assert.deepEqual(decideRetrievedPaymentTransition(order, failed), {
  ok: false,
  reason: 'retrieve_failed',
  category: 'not_found',
  code: 'iyzico_payment_not_found',
})

console.log('payment-retrieve-reconciliation.test: PASS (PAY-06D-30)')
