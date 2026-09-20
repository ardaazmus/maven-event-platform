import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const schema = readFileSync('prisma/schema.prisma', 'utf8')
const start = schema.indexOf('model CheckInEvent {')
assert(start !== -1, 'CheckInEvent olmalı')
const end = schema.indexOf('\nmodel ', start + 1)
const m = schema.slice(start, end)
assert(m.includes('credentialId') || m.includes('credential '), 'credential bağı olmalı')
assert(m.includes('deviceId') || m.includes('gate'), 'cihaz/kapı olmalı')

console.log('checkin-model.test: PASS')
