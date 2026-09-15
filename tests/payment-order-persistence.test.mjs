import assert from 'node:assert'
import { createOrReusePaymentOrder } from '../src/lib/payment-order-persistence.ts'
import { isPublicPaymentKey } from '../src/lib/payment-status-key.ts'

const snapshot = {
  workspaceId: 'ws_123',
  formId: 'form_123',
  publishedVersionId: 'version_123',
  provider: 'stripe',
  mode: 'test',
  idempotencyKey: 'order_test_123456',
  amountMinor: 12550,
  currency: 'TRY',
}

let created
const createCalls = []
const tx = {
  paymentOrder: {
    findUnique: async () => null,
    create: async (args) => {
      createCalls.push(args)
      created = { id: 'po_123', ...args.data, status: 'created' }
      return created
    },
  },
}

assert.deepEqual(await createOrReusePaymentOrder(tx, snapshot), { created: true, order: created })
assert.deepEqual(createCalls[0].data, { ...snapshot, publicKey: created.publicKey, submissionId: null })
assert.equal(isPublicPaymentKey(created.publicKey), true)

const existing = { id: 'po_existing', ...snapshot, status: 'processing' }
const reused = await createOrReusePaymentOrder({
  paymentOrder: {
    findUnique: async () => existing,
    create: async () => { throw new Error('must not create when idempotency exists') },
  },
}, snapshot)
assert.deepEqual(reused, { created: false, order: existing })

let lookupCount = 0
const raced = await createOrReusePaymentOrder({
  paymentOrder: {
    findUnique: async () => {
      lookupCount += 1
      return lookupCount === 1 ? null : existing
    },
    create: async () => { throw Object.assign(new Error('unique'), { code: 'P2002' }) },
  },
}, snapshot)
assert.deepEqual(raced, { created: false, order: existing })
assert.equal(lookupCount, 2)

const conflict = await createOrReusePaymentOrder({
  paymentOrder: {
    findUnique: async () => ({ ...existing, amountMinor: 99999 }),
    create: async () => { throw new Error('must not create for an idempotency conflict') },
  },
}, snapshot)
assert.deepEqual(conflict, { created: false, conflict: 'snapshot_mismatch' })

console.log('payment-order-persistence.test: PASS (PAY-06D-02)')
