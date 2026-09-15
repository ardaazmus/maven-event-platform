import assert from 'node:assert'
import { queueIyzicoPaymentRetrieve } from '../src/lib/payment-retrieve-handoff.ts'

const updates = []
const attempts = []
const queued = await queueIyzicoPaymentRetrieve({
  paymentOrder: {
    findUnique: async () => ({ id: 'po_123', provider: 'iyzico', providerOrderId: null, status: 'created' }),
    update: async args => { updates.push(args); return { id: 'po_123', provider: 'iyzico', providerOrderId: 'token_123456', status: 'processing' } },
  },
  paymentAttempt: {
    findFirst: async () => null,
    create: async args => { attempts.push(args); return args.data },
  },
}, { paymentOrderId: 'po_123', providerReference: 'token_123456' })

assert.deepEqual(queued, { ok: true, queued: true, status: 'processing' })
assert.deepEqual(updates, [{ where: { id: 'po_123' }, data: { providerOrderId: 'token_123456', status: 'processing' } }])
assert.deepEqual(attempts, [{ data: { paymentOrderId: 'po_123', provider: 'iyzico', providerPaymentId: 'token_123456', status: 'processing' } }])

const conflict = await queueIyzicoPaymentRetrieve({
  paymentOrder: {
    findUnique: async () => ({ id: 'po_123', provider: 'iyzico', providerOrderId: 'token_other', status: 'created' }),
    update: async () => { throw new Error('must not update conflicting token') },
  },
  paymentAttempt: { findFirst: async () => null, create: async () => { throw new Error('must not create conflicting token') } },
}, { paymentOrderId: 'po_123', providerReference: 'token_123456' })
assert.deepEqual(conflict, { ok: false, reason: 'provider_reference_conflict' })

console.log('payment-retrieve-handoff.test: PASS (PAY-06D-25)')
