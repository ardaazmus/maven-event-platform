import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const schema = readFileSync('prisma/schema.prisma', 'utf8')
const m = schema.slice(schema.indexOf('model OutboxEvent'))
assert(m.includes('formId') && m.includes('String?'), 'formId opsiyonel olmalı')
assert(m.includes('submissionId') && m.includes('String?'), 'submissionId opsiyonel olmalı')
assert(m.includes('eventType'), 'eventType olmalı')
assert(m.includes('aggregateType') && m.includes('aggregateId'), 'aggregate bağı olmalı')
assert(m.includes('correlationId'), 'correlationId olmalı')

console.log('outbox-generic.test: PASS')
