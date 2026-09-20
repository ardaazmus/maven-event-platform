import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const schema = readFileSync('prisma/schema.prisma', 'utf8')
assert(schema.includes('model Payment '), 'Payment modeli olmalı')
assert(schema.includes('model PaymentAllocation '), 'Allocation modeli olmalı')
assert(schema.includes('idempotencyKey'), 'idempotency olmalı')
assert(schema.includes('evidenceHash') || schema.includes('evidence'), 'kanıt hash olmalı')
assert(schema.includes('method'), 'yöntem olmalı')

console.log('payment-model.test: PASS')
