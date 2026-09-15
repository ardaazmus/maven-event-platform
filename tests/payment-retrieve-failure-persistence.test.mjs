import assert from 'node:assert'
import { existsSync, readFileSync } from 'node:fs'
import { applyPaymentRetrieveFailure } from '../src/lib/payment-retrieve-failure-persistence.ts'

const schema = readFileSync('prisma/schema.prisma', 'utf8')
const migrationPath = 'prisma/migrations/20260904005000_add_payment_retrieve_next_attempt/migration.sql'
assert(existsSync(migrationPath), 'retrieve next attempt migration must be present')
const migration = readFileSync(migrationPath, 'utf8')
assert(/retrieveNextAttemptAt\s+DateTime\?/.test(schema), 'retrieve next attempt time must be persisted')
assert(schema.includes('@@index([status, retrieveNextAttemptAt])'), 'retry lookup must be indexed')
assert(migration.includes('ALTER TABLE "PaymentAttempt" ADD COLUMN "retrieveNextAttemptAt" DATETIME'), 'migration must add next attempt time')
assert(migration.includes('PaymentAttempt_status_retrieveNextAttemptAt_idx'), 'migration must index retry lookup')

const updates = []
const tx = { paymentAttempt: { updateMany: async args => { updates.push(args); return { count: 1 } } } }
const job = {
  attemptId: 'attempt_123', paymentOrderId: 'order_123', provider: 'iyzico', providerPaymentId: 'token_123456',
  attemptCount: 2, lockedBy: 'worker-1', lockedUntilMs: 40_000,
}
assert.deepEqual(await applyPaymentRetrieveFailure(tx, {
  job,
  decision: {
    action: 'retry', attemptCount: 2, retryAtMs: 12_000, errorCategory: 'unavailable', errorCode: 'provider_unavailable', lockedBy: null, lockedUntilMs: null,
  },
  nowMs: 10_000,
}), { ok: true, action: 'retry' })
assert.deepEqual(updates[0], {
  where: {
    id: 'attempt_123', paymentOrderId: 'order_123', provider: 'iyzico', providerPaymentId: 'token_123456', status: 'processing',
    retrieveLockedBy: 'worker-1', retrieveLockedUntil: { gt: new Date(10_000) },
  },
  data: {
    status: 'processing', errorCategory: 'unavailable', errorCode: 'provider_unavailable',
    retrieveNextAttemptAt: new Date(12_000), retrieveLockedBy: null, retrieveLockedUntil: null,
  },
})

const terminalUpdates = []
const terminalTx = { paymentAttempt: { updateMany: async args => { terminalUpdates.push(args); return { count: 1 } } } }
assert.deepEqual(await applyPaymentRetrieveFailure(terminalTx, {
  job,
  decision: {
    action: 'fail', attemptCount: 2, errorCategory: 'configuration', errorCode: 'provider_authentication_failed', lockedBy: null, lockedUntilMs: null,
  },
  nowMs: 10_000,
}), { ok: true, action: 'fail' })
assert.equal(terminalUpdates[0].data.status, 'failed')
assert.equal(terminalUpdates[0].data.retrieveNextAttemptAt, null)

const lostTx = { paymentAttempt: { updateMany: async () => ({ count: 0 }) } }
assert.deepEqual(await applyPaymentRetrieveFailure(lostTx, {
  job,
  decision: {
    action: 'fail', attemptCount: 2, errorCategory: 'configuration', errorCode: 'provider_authentication_failed', lockedBy: null, lockedUntilMs: null,
  },
  nowMs: 10_000,
}), { ok: false, reason: 'claim_lost' })

console.log('payment-retrieve-failure-persistence.test: PASS (PAY-06D-36)')
