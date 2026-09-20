import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const schema = readFileSync('prisma/schema.prisma', 'utf8')
const start = schema.indexOf('model InventoryHold {')
assert(start !== -1, 'InventoryHold olmalı')
const end = schema.indexOf('\nmodel ', start + 1)
const m = schema.slice(start, end)
assert(m.includes('holdToken') && m.includes('@unique'), 'holdToken unique olmalı')
assert(m.includes('expiresAt'), 'TTL olmalı')
assert(m.includes('status'), 'status olmalı')

console.log('hold-model.test: PASS')
