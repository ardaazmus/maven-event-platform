import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const fieldsRoute = readFileSync('src/app/api/forms/[id]/fields/route.ts', 'utf8')
const fieldRoute = readFileSync('src/app/api/forms/[id]/fields/[fieldId]/route.ts', 'utf8')

assert(fieldsRoute.includes('normalizeFieldConfig'), 'field collection route must normalize layout config')
assert(fieldRoute.includes('normalizeFieldConfig'), 'single field route must normalize layout config')
assert(fieldsRoute.includes('JSON.stringify(normalizeFieldConfig(parsed.data.config))'), 'new fields must persist normalized config')
assert(fieldRoute.includes('JSON.stringify(normalizeFieldConfig(body.config))'), 'updated fields must persist normalized config')
assert(fieldsRoute.includes('config: normalizeFieldConfig(JSON.parse(f.configJson || \'{}\'))'), 'field GET must return normalized config')

console.log('form-layout-api.test: PASS (AC-LAYOUT-02)')
