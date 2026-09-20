import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const schema = readFileSync('prisma/schema.prisma', 'utf8')
const start = schema.indexOf('model InvoiceDelivery {')
assert(start !== -1, 'InvoiceDelivery modeli olmalı')
const end = schema.indexOf('\nmodel ', start + 1)
const m = schema.slice(start, end)
assert(m.includes('channel'), 'kanal olmalı')
assert(m.includes('idempotencyKey'), 'idempotency olmalı')
assert(m.includes('status'), 'status olmalı')

console.log('invoice-delivery-model.test: PASS')
