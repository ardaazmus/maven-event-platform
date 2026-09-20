import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const schema = readFileSync('prisma/schema.prisma', 'utf8')
const start = schema.indexOf('model ExternalIdMapping {')
assert(start !== -1, 'ExternalIdMapping olmalı')
const end = schema.indexOf('\nmodel ', start + 1)
const m = schema.slice(start, end)
assert(m.includes('sourceSystem') && m.includes('sourceType') && m.includes('sourceId'), 'source üçlüsü olmalı')
assert(m.includes('coreType') && m.includes('coreId'), 'core referansı olmalı')
assert(m.includes('@@unique'), 'unique kısıtı olmalı')

console.log('id-mapping-model.test: PASS')
