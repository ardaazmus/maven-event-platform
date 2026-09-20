import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const schema = readFileSync('prisma/schema.prisma', 'utf8')
const start = schema.indexOf('model Payment {')
const end = schema.indexOf('\nmodel ', start + 1)
const m = schema.slice(start, end)
assert(m.includes('reversalOfId'), 'reversalOfId olmalı')
assert(m.includes('reversed'), 'reversed durumu olmalı')

console.log('payment-reversal-model.test: PASS')
