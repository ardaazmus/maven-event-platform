import assert from 'node:assert'
import { readFileSync } from 'node:fs'
import { emailQueuePriority, normalizeEmailQueueClass } from '../src/lib/email-queue.ts'
import { clearOutbox, enqueue, processOutboxOnce } from '../src/lib/outbox.ts'

assert.equal(normalizeEmailQueueClass(' TRANSACTIONAL '), 'transactional')
assert.equal(emailQueuePriority('transactional') > emailQueuePriority('notification'), true)
assert.equal(emailQueuePriority('notification') > emailQueuePriority('marketing'), true)
assert.throws(() => normalizeEmailQueueClass('bulk'), /invalid email queue class/)

clearOutbox()
enqueue('form-1', 'sub-marketing', 'email', {}, { queueClass: 'marketing' })
enqueue('form-1', 'sub-invoice', 'email', {}, { queueClass: 'transactional' })
const delivered = []
await processOutboxOnce(async event => delivered.push(event.queueClass))
assert.deepEqual(delivered, ['transactional', 'marketing'], 'transactional email must be processed before marketing email')

const schema = readFileSync('prisma/schema.prisma', 'utf8')
const migration = readFileSync('prisma/migrations/20260903210000_add_outbox_email_queue_fields/migration.sql', 'utf8')
const model = schema.slice(schema.indexOf('model OutboxEvent {'), schema.indexOf('model EmailProviderEvent {'))
assert(model.includes('queueClass'), 'outbox must carry an email queue class')
assert(model.includes('priority'), 'outbox must carry a queue priority')
assert(migration.includes('OutboxEvent_queueClass_priority_idx'), 'queue class and priority must be indexed')

console.log('email-queue.test: PASS (MAIL-07)')
