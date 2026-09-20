import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const schema = readFileSync('prisma/schema.prisma', 'utf8')
const start = schema.indexOf('model InventoryHold {')
assert(start !== -1, 'InventoryHold olmalı')
const end = schema.indexOf('\nmodel ', start + 1)
const m = schema.slice(start, end)
assert(m.includes('assignedTicketId'), 'assignedTicketId olmalı')

console.log('assignment-model.test: PASS')
