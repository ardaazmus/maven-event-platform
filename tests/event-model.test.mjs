import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const schema = readFileSync('prisma/schema.prisma', 'utf8')
assert(schema.includes('model Event '), 'Event modeli olmalı')
assert(schema.includes('model EventOccurrence '), 'EventOccurrence modeli olmalı')
assert(schema.includes('workspaceId'), 'workspace scope olmalı')
assert(schema.includes('status'), 'status olmalı')
assert(schema.includes('timezone'), 'timezone olmalı')
assert(schema.includes('startsAt'), 'occurrence tarihleri olmalı')

console.log('event-model.test: PASS')
