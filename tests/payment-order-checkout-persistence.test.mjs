import assert from 'node:assert'
import { attachProviderCheckout } from '../src/lib/payment-order-checkout-persistence.ts'

const order = { id: 'po_123', provider: 'iyzico', providerOrderId: null, status: 'created' }
const updates = []
const attempts = []
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

assert.deepEqual(await attachProviderCheckout(tx, { paymentOrderId: 'po_123', provider: 'iyzico', providerReference: 'token_123', status: 'requires_action' }), {
  ok: true, reused: false, status: 'requires_action', providerReference: 'token_123',
})
assert.deepEqual(updates[0], { where: { id: 'po_123' }, data: { providerOrderId: 'token_123', status: 'requires_action' } })
assert.deepEqual(attempts[0], { data: { paymentOrderId: 'po_123', provider: 'iyzico', providerPaymentId: 'token_123', status: 'requires_action' } })

assert.deepEqual(await attachProviderCheckout({
  paymentOrder: { findUnique: async () => ({ ...order, providerOrderId: 'token_old', status: 'created' }), update: async () => { throw new Error('must not update conflicting reference') } },
  paymentAttempt: { findFirst: async () => null, create: async () => { throw new Error('must not create conflicting attempt') } },
}, { paymentOrderId: 'po_123', provider: 'iyzico', providerReference: 'token_new', status: 'requires_action' }), { ok: false, reason: 'provider_reference_conflict' })

console.log('payment-order-checkout-persistence.test: PASS (PAY-06D-11)')
