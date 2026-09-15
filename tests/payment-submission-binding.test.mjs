import assert from 'node:assert/strict'
import { bindPaymentOrderToSubmission } from '../src/lib/payment-submission-binding.ts'

const baseInput = {
  paymentOrderId: 'po_1',
  submissionId: 'sub_1',
  workspaceId: 'ws_1',
  formId: 'form_1',
}

const order = {
  id: 'po_1',
  workspaceId: 'ws_1',
  formId: 'form_1',
  submissionId: null,
  status: 'created',
}

let updates = []
const tx = {
  paymentOrder: {
    findUnique: async () => order,
    update: async ({ data }) => {
      updates.push(data)
      return { ...order, ...data }
    },
  },
}

assert.deepEqual(await bindPaymentOrderToSubmission(tx, baseInput), {
  ok: true,
  reused: false,
  paymentOrderId: 'po_1',
  submissionId: 'sub_1',
})
assert.deepEqual(updates, [{ submissionId: 'sub_1' }])

assert.deepEqual(await bindPaymentOrderToSubmission({
  paymentOrder: {
    findUnique: async () => ({ ...order, submissionId: 'sub_1' }),
    update: async () => { throw new Error('must not update an idempotent binding') },
  },
}, baseInput), {
  ok: true,
  reused: true,
  paymentOrderId: 'po_1',
  submissionId: 'sub_1',
})

assert.deepEqual(await bindPaymentOrderToSubmission({
  paymentOrder: {
    findUnique: async () => ({ ...order, submissionId: 'sub_other' }),
    update: async () => { throw new Error('must not overwrite a different submission') },
  },
}, baseInput), { ok: false, reason: 'submission_conflict' })

assert.deepEqual(await bindPaymentOrderToSubmission({
  paymentOrder: {
    findUnique: async () => ({ ...order, workspaceId: 'ws_other' }),
    update: async () => { throw new Error('must not cross workspace boundary') },
  },
}, baseInput), { ok: false, reason: 'payment_order_not_found' })

console.log('payment-submission-binding.test: PASS (INV/F C-02)')
