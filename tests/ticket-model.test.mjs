import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const schema = readFileSync('prisma/schema.prisma', 'utf8')
const t = schema.slice(schema.indexOf('model Ticket {'), schema.indexOf('\nmodel ', schema.indexOf('model Ticket {') + 1))
assert(t.includes('registrationId') || t.includes('registration '), 'registration bağı olmalı')
const c = schema.slice(schema.indexOf('model Credential {'), schema.indexOf('\nmodel ', schema.indexOf('model Credential {') + 1))
assert(c.includes('qr') || c.includes('code'), 'QR kimliği olmalı')

console.log('ticket-model.test: PASS')
