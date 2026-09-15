import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { evaluateQueuedEmailDelivery, extractQueuedEmailRecipient } from '../src/lib/email-delivery-guard.ts'
import { emailQueuePriority } from '../src/lib/email-queue.ts'
import { rateLimitDeferData } from '../src/lib/outbox-worker.ts'

const worker = readFileSync('src/lib/outbox-worker.ts', 'utf8')
assert(worker.includes('lockedUntil') && worker.includes('lockedBy'), 'outbox claim must use a lease')
assert(worker.includes('attemptCount') && worker.includes('Math.pow(2, attempts)'), 'outbox failure must back off')
assert(worker.includes("status: isDead ? 'dead' : 'failed'"), 'exhausted failures must dead-letter')
assert(worker.includes('emailSuppression.findMany') && worker.includes('workspaceEmailProtection.findUnique'), 'provider dispatch must consult durable email protection')

const future = Date.now() + 60_000
assert.deepEqual(rateLimitDeferData(future, Date.now()), { status: 'queued', availableAt: new Date(future), lastError: 'email_rate_limited', lockedBy: null, lockedUntil: null })
assert.throws(() => rateLimitDeferData(Date.now(), Date.now()), /retry time must be in the future/)
assert.equal(emailQueuePriority('transactional') > emailQueuePriority('notification'), true)
assert.deepEqual(evaluateQueuedEmailDelivery({ messageClass: 'transactional', suppressionScopes: ['marketing'], marketingPaused: true }), { status: 'allowed' })
assert.deepEqual(evaluateQueuedEmailDelivery({ messageClass: 'marketing', suppressionScopes: ['marketing'], marketingPaused: false }), { status: 'blocked', reason: 'recipient_suppressed' })
assert.equal(extractQueuedEmailRecipient('{"recipientEmail":" Buyer@example.com "}'), 'buyer@example.com')
assert.throws(() => extractQueuedEmailRecipient('{"recipientEmail":"not-an-email"}'), /queued_email_recipient_invalid/)

console.log('invoice-outbox-behavior.test: PASS (P-12D-02)')
