import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const schema = readFileSync('prisma/schema.prisma','utf8')
assert(schema.includes('model OutboxEvent'), 'must have OutboxEvent')
assert(schema.includes('workspaceId'), 'must have workspaceId')
assert(schema.includes('payloadJson'), 'must have payloadJson')
assert(schema.includes('attemptCount'), 'must have attemptCount')
assert(schema.includes('availableAt'), 'must have availableAt')
assert(schema.includes('lockedUntil'), 'must have lockedUntil')
assert(schema.includes('status'), 'must have status')
assert(schema.includes('@@index([status, availableAt])'), 'must have status index')

console.log('outbox-prisma.test: PASS (AC-OUTBOX-01)')
