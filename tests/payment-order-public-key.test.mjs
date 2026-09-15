import assert from 'node:assert'
import { createOrReusePaymentOrder } from '../src/lib/payment-order-persistence.ts'
import { isPublicPaymentKey } from '../src/lib/payment-status-key.ts'

const snapshot = {
  workspaceId: 'ws_public_key',
  formId: 'form_public_key',
  publishedVersionId: 'version_public_key',
  provider: 'iyzico',
  mode: 'test',
  idempotencyKey: 'public_key_test_1234',
  amountMinor: 9900,
  currency: 'TRY',
}

let createdData
const order = await createOrReusePaymentOrder({
  paymentOrder: {
    findUnique: async () => null,
    create: async ({ data }) => {
      createdData = data
      return { id: 'po_public_key', ...data, status: 'created' }
    },
  },
}, snapshot)

assert.equal(order.created, true)
assert.equal(isPublicPaymentKey(createdData.publicKey), true)
assert.equal(order.order.publicKey, createdData.publicKey)
assert.notEqual(order.order.publicKey, order.order.id)

console.log('payment-order-public-key.test: PASS (PAY-06D-18)')
