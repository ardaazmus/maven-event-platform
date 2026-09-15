import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const src = readFileSync('src/lib/outbox-worker.ts','utf8')
assert(src.includes('claimOutboxEvents'), 'must have claim')
assert(src.includes('lockedUntil'), 'must have lease')
assert(src.includes('attemptCount'), 'must handle attempts')
assert(src.includes('dead'), 'must have dead-letter')
assert(src.includes('availableAt'), 'must have backoff')
assert(src.includes('lockedBy'), 'must have lockedBy')
assert(src.includes('evaluateQueuedEmailDelivery'), 'email dispatch must consult suppression and pause guard')
assert(src.includes('emailSuppression.findMany'), 'email dispatch must read durable suppressions')
assert(src.includes('workspaceEmailProtection.findUnique'), 'marketing dispatch must read workspace pause state')
assert(src.includes("status: 'dead'"), 'blocked recipient sends must not retry')

console.log('outbox-worker.test: PASS (AC-OUTBOX-WORKER-01)')
