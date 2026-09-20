import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const schema = readFileSync('prisma/schema.prisma', 'utf8')
const start = schema.indexOf('model MediaAsset {')
assert(start !== -1, 'MediaAsset olmalı')
const end = schema.indexOf('\nmodel ', start + 1)
const m = schema.slice(start, end)
assert(m.includes('invoiceId'), 'invoiceId bağı olmalı')

console.log('invoice-document-model.test: PASS')
