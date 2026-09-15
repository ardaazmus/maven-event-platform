import assert from 'node:assert'
import { runNextDuePaymentRetrieveFromDatabase } from '../src/lib/payment-retrieve-database-worker.ts'

const attempt = {
  id: 'attempt_123', paymentOrderId: 'order_123', provider: 'stripe', providerPaymentId: 'pi_123456',
  status: 'processing', retrieveAttemptCount: 0, retrieveLockedUntil: null, retrieveNextAttemptAt: null,
}

const updates = []
const transactions = [
  async callback => callback({
    paymentAttempt: {
      findFirst: async () => attempt,
      findUnique: async args => args.select.paymentOrder
        ? { paymentOrder: { workspaceId: 'workspace_123', provider: 'stripe', mode: 'test' } }
        : attempt,
      updateMany: async () => ({ count: 1 }),
    },
    paymentProviderConnection: { findUnique: async () => null },
  }),
  async callback => callback({
    paymentAttempt: {
      updateMany: async args => { updates.push(args); return { count: 1 } },
    },
  }),
]
const result = await runNextDuePaymentRetrieveFromDatabase({
  transaction: async callback => transactions.shift()(callback),
  nowMs: 1_000,
  workerId: 'worker_123',
})

assert.deepEqual(result, { ok: false, stage: 'connection', reason: 'connection_not_found', persistence: 'fail' })
assert.equal(updates.length, 1)
assert.equal(updates[0].data.status, 'failed')
assert.equal(updates[0].data.errorCategory, 'configuration')
assert.equal(updates[0].data.retrieveLockedBy, null)
assert.equal(updates[0].data.retrieveLockedUntil, null)

console.log('payment-retrieve-database-worker.test: PASS (PAY-06D-45)')
