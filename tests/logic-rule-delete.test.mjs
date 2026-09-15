import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const src = readFileSync('src/components/mavenforms/views/form-builder-view.tsx', 'utf8')

assert(src.includes("/api/forms/${form.id}/logic/${rule.id}"), 'logic delete must use the form-scoped rule endpoint')
assert(src.includes('if (!confirm('), 'logic delete must require an explicit confirmation')
assert(src.includes('Kural silinemedi'), 'logic delete failures must be visible')
assert(src.includes('kuralını sil'), 'logic delete control must have an accessible name')

console.log('logic-rule-delete.test: PASS (AC-LOGIC-RULE-DELETE-01)')
