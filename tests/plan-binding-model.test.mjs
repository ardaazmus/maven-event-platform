import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const schema = readFileSync('prisma/schema.prisma', 'utf8')
const start = schema.indexOf('model FloorPlanBinding {')
assert(start !== -1, 'FloorPlanBinding olmalı')
const end = schema.indexOf('\nmodel ', start + 1)
const m = schema.slice(start, end)
assert(m.includes('eventId'), 'event bağı olmalı')
assert(m.includes('externalPlanId') || m.includes('planId'), 'external plan referansı olmalı')
assert(m.includes('planVersion') || m.includes('version'), 'sürüm olmalı')

console.log('plan-binding-model.test: PASS')
