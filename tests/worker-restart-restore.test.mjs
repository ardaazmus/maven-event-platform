import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const worker = readFileSync('src/lib/outbox-worker.ts', 'utf8')
const delivery = readFileSync('src/lib/invoice-delivery-enqueue.ts', 'utf8')
const runbook = readFileSync('docs/runbooks/worker-restart-restore.md', 'utf8')

assert(worker.includes("status: { in: ['queued', 'failed', 'sending'] }"), 'expired sending leases must be eligible after worker restart')
assert(worker.includes("lockedUntil: { lt: now }"), 'recovery must require an expired lease')
assert(worker.includes("where: { id: ev.id, status: { in: ['queued', 'failed', 'sending'] }, OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }] }"), 'reclaim must use a compare-and-set lease boundary')
assert(worker.includes("status: { in: ['queued', 'failed', 'sending'] }, OR:"), 'reclaim CAS must not resurrect a completed event')
assert(delivery.includes('invoiceDeliveryIntent') && delivery.includes('idempotencyKey'), 'invoice delivery must retain the durable duplicate fence')
assert(delivery.includes('client.$transaction'), 'delivery intent and outbox replay protection must remain transactional')
assert(runbook.includes('DATABASE_URL') && runbook.includes('prisma migrate deploy'), 'runbook must describe safe database restore preparation')
assert(runbook.includes('/api/ready') && /expired[\s\S]{0,40}lease/i.test(runbook), 'runbook must include readiness and lease recovery checks')
assert(runbook.includes('production') && runbook.includes('silme'), 'runbook must prohibit destructive production recovery')

console.log('worker-restart-restore.test: PASS (R-08)')
