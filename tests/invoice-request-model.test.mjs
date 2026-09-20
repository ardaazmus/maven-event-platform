import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const schema = readFileSync('prisma/schema.prisma', 'utf8')
const start = schema.indexOf('model InvoiceRequest {')
assert(start !== -1, 'InvoiceRequest modeli olmalı')
const end = schema.indexOf('\nmodel ', start + 1)
const m = schema.slice(start, end)
assert(m.includes('orderId') || m.includes('order '), 'order bağı olmalı')
assert(m.includes('recipientType') || m.includes('legalName'), 'alıcı snapshot olmalı')
assert(m.includes('status'), 'status olmalı')

console.log('invoice-request-model.test: PASS')
