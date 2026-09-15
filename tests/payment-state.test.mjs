import assert from 'node:assert'
import { evaluatePaymentTransition } from '../src/lib/payment-state.ts'

const order = { provider: 'stripe', providerOrderId: 'pi_123', amountMinor: 50000, currency: 'TRY', status: 'created' }
const signed = { provider: 'stripe', providerPaymentId: 'pi_123', signatureVerified: true, targetStatus: 'succeeded', amountMinor: 50000, currency: 'try' }

assert.deepEqual(evaluatePaymentTransition(order, signed), { accepted: true, changed: true, status: 'succeeded' })
assert.deepEqual(evaluatePaymentTransition(order, { ...signed, signatureVerified: false }), { accepted: false, reason: 'signature_not_verified' })
assert.deepEqual(evaluatePaymentTransition(order, { ...signed, providerPaymentId: 'pi_other' }), { accepted: false, reason: 'payment_id_mismatch' })
assert.deepEqual(evaluatePaymentTransition(order, { ...signed, amountMinor: 50001 }), { accepted: false, reason: 'amount_mismatch' })
assert.deepEqual(evaluatePaymentTransition(order, { ...signed, currency: 'USD' }), { accepted: false, reason: 'currency_mismatch' })
assert.deepEqual(evaluatePaymentTransition({ ...order, status: 'failed' }, signed), { accepted: false, reason: 'invalid_transition' })
assert.deepEqual(evaluatePaymentTransition({ ...order, status: 'succeeded' }, { ...signed, targetStatus: 'succeeded' }), { accepted: true, changed: false, status: 'succeeded' })
assert.deepEqual(evaluatePaymentTransition({ ...order, status: 'succeeded' }, { ...signed, targetStatus: 'refunded' }), { accepted: true, changed: true, status: 'refunded' })

console.log('payment-state.test: PASS (PAY-06A)')
