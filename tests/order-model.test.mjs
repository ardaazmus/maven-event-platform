import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const schema = readFileSync('prisma/schema.prisma', 'utf8')
assert(schema.includes('model Order '), 'Order modeli olmalı')
assert(schema.includes('model OrderItem '), 'OrderItem modeli olmalı')
assert(schema.includes('currency'), 'ISO currency olmalı')
assert(schema.includes('unitAmount') || schema.includes('minor'), 'minor-unit tutar olmalı')
assert(schema.includes('snapshot') || schema.includes('Snapshot'), 'snapshot olmalı')

console.log('order-model.test: PASS')
