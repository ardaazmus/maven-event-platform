import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const builder = readFileSync('src/components/mavenforms/views/form-builder-view.tsx', 'utf8')
const appearance = readFileSync('src/components/mavenforms/views/appearance-panel.tsx', 'utf8')

assert(builder.includes('Formu kaydet'), 'builder save action must identify form metadata scope')
assert(appearance.includes('Görünümü kaydet'), 'appearance save action must identify appearance scope')
assert(builder.includes("/api/forms/${form.id}") && appearance.includes("/api/forms/${formId}/appearance"), 'scoped save endpoints must remain separate')
assert(!appearance.includes('>Kaydet<'), 'appearance panel must not expose an unscoped save label')

console.log('form-ux-save-scope.test: PASS')
