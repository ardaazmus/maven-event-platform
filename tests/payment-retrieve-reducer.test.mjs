import assert from 'node:assert'
import { normalizeProviderRetrieveResult } from '../src/lib/payment-retrieve-contract.ts'
import { applyRetrievedPaymentDecision } from '../src/lib/payment-retrieve-reducer.ts'

const orderUpdates = []
const attemptUpdates = []
const tx = {
  paymentOrder: {
    findUnique: async () => ({
      id: 'order_123',
      provider: 'iyzico',
      providerOrderId: 'token_123456',
      amountMinor: 12_500,
      currency: 'TRY',
      status: 'processing',
    }),
    update: async args => { orderUpdates.push(args); return { ...args.data } },
  },
  paymentAttempt: {
    updateMany: async args => { attemptUpdates.push(args); return { count: 1 } },
  },
}

const job = {
  attemptId: 'attempt_123',
  paymentOrderId: 'order_123',
  provider: 'iyzico',
  providerPaymentId: 'token_123456',
  attemptCount: 2,
  lockedBy: 'worker-1',
  lockedUntilMs: 40_000,
}
const retrieved = normalizeProviderRetrieveResult('iyzico', {
  ok: true,
  providerPaymentId: 'token_123456',
  status: 'succeeded',
  amountMinor: 12_500,
  currency: 'TRY',
})

assert.deepEqual(await applyRetrievedPaymentDecision(tx, {
  job,
  retrieved,
  nowMs: 10_000,
}), { ok: true, changed: true, status: 'succeeded' })
assert.deepEqual(attemptUpdates[0], {
  where: {
    id: 'attempt_123',
    paymentOrderId: 'order_123',
    provider: 'iyzico',
    providerPaymentId: 'token_123456',
    status: 'processing',
    retrieveLockedBy: 'worker-1',
    retrieveLockedUntil: { gt: new Date(10_000) },
  },
  data: {
    status: 'succeeded',
    retrieveLockedBy: null,
    retrieveLockedUntil: null,
  },
})
assert.deepEqual(orderUpdates[0], { where: { id: 'order_123' }, data: { status: 'succeeded' } })

const noDecisionWrites = []
const invalidTx = {
  paymentOrder: {
    findUnique: async () => ({
      id: 'order_123', provider: 'iyzico', providerOrderId: 'token_123456', amountMinor: 12_500, currency: 'TRY', status: 'processing',
    }),
    update: async () => { throw new Error('must not update on reconciliation mismatch') },
  },
  paymentAttempt: {
    updateMany: async args => { noDecisionWrites.push(args); return { count: 1 } },
  },
}
const wrongAmount = normalizeProviderRetrieveResult('iyzico', {
  ok: true, providerPaymentId: 'token_123456', status: 'succeeded', amountMinor: 12_499, currency: 'TRY',
})
assert.deepEqual(await applyRetrievedPaymentDecision(invalidTx, {
  job, retrieved: wrongAmount, nowMs: 10_000,
}), { ok: false, reason: 'amount_mismatch' })
assert.equal(noDecisionWrites.length, 0)

const lostTx = {
  paymentOrder: {
    findUnique: async () => ({
      id: 'order_123', provider: 'iyzico', providerOrderId: 'token_123456', amountMinor: 12_500, currency: 'TRY', status: 'processing',
    }),
    update: async () => { throw new Error('must not update after claim loss') },
  },
  paymentAttempt: { updateMany: async () => ({ count: 0 }) },
}
assert.deepEqual(await applyRetrievedPaymentDecision(lostTx, {
  job, retrieved, nowMs: 10_000,
}), { ok: false, reason: 'claim_lost' })

const refundWrites = []
const refundTx = {
  paymentOrder: {
    findUnique: async () => ({
      id: 'order_123', provider: 'iyzico', providerOrderId: 'token_123456', amountMinor: 12_500, currency: 'TRY', status: 'succeeded', workspaceId: 'workspace_1',
    }),
    update: async args => { refundWrites.push(['order.update', args]); return { ...args.data } },
  },
  paymentAttempt: {
    updateMany: async args => { refundWrites.push(['attempt.updateMany', args]); return { count: 1 } },
  },
  invoiceRecord: {
    findFirst: async () => ({ id: 'invoice_123', workspaceId: 'workspace_1', paymentOrderId: 'order_123', state: 'issued' }),
    updateMany: async args => { refundWrites.push(['invoice.updateMany', args]); return { count: 1 } },
  },
  auditLog: {
    create: async args => { refundWrites.push(['audit.create', args]); return { id: 'audit_123' } },
  },
}
const refunded = normalizeProviderRetrieveResult('iyzico', {
  ok: true, providerPaymentId: 'token_123456', status: 'refunded', amountMinor: 12_500, currency: 'TRY',
})
assert.deepEqual(await applyRetrievedPaymentDecision(refundTx, {
  job, retrieved: refunded, nowMs: 10_000,
}), { ok: true, changed: true, status: 'refunded' })
assert.deepEqual(refundWrites.map(([name]) => name), ['attempt.updateMany', 'order.update', 'invoice.updateMany', 'audit.create'])
assert.deepEqual(refundWrites[2][1], {
  where: { id: 'invoice_123', workspaceId: 'workspace_1', state: 'issued' },
  data: { state: 'refund_or_credit_note_review' },
})

console.log('payment-retrieve-reducer.test: PASS (R-00-04)')
