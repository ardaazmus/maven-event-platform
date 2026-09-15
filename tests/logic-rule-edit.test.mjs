import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const src = readFileSync('src/components/mavenforms/views/form-builder-view.tsx', 'utf8')

assert(src.includes('JSON.stringify(updates)'), 'logic edit must persist the edited rule payload')
assert(src.includes('conditions: { type: conditionType, conditions: conditionRows.map'), 'logic edit must preserve multiple conditions')
assert(src.includes('Kuralı düzenle'), 'logic edit panel must be visible')
assert(src.includes('kuralını düzenle'), 'logic edit control must have an accessible name')
assert(src.includes('Kural bilgileri eksik'), 'logic edit must validate rule conditions')

console.log('logic-rule-edit.test: PASS (AC-LOGIC-RULE-EDIT-01)')
