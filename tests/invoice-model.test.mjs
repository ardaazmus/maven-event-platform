import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const schema = readFileSync('prisma/schema.prisma', 'utf8')
const start = schema.indexOf('model Invoice {')
assert(start !== -1, 'Invoice modeli olmalı')
const end = schema.indexOf('\nmodel ', start + 1)
const m = schema.slice(start, end)
assert(m.includes('number') || m.includes('invoiceNumber'), 'numara olmalı')
assert(m.includes('requestId') || m.includes('InvoiceRequest'), 'request bağı olmalı')

const rstart = schema.indexOf('model InvoiceRelation {')
assert(rstart !== -1, 'InvoiceRelation olmalı')

console.log('invoice-model.test: PASS')
