import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const schema = readFileSync('prisma/schema.prisma', 'utf8')
const start = schema.indexOf('model CheckoutIntent {')
assert(start !== -1, 'CheckoutIntent olmalı')
const end = schema.indexOf('\nmodel ', start + 1)
const m = schema.slice(start, end)
assert(m.includes('orderId'), 'order bağı olmalı')
assert(m.includes('amountMinor'), 'server tutarı olmalı')
assert(m.includes('idempotencyKey'), 'idempotency olmalı')
assert(m.includes('provider') && m.includes('mode'), 'provider/mode olmalı')

console.log('checkout-intent-model.test: PASS')
