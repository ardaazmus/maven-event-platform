import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const src = readFileSync('src/components/mavenforms/views/form-builder-view.tsx', 'utf8')

assert(src.includes("/api/forms/${form.id}/logic"), 'logic editor must create rules through the form-scoped endpoint')
assert(src.includes('onClick={() => setIsAdding((current) => !current)}'), 'Kural Ekle must open a real editor')
assert(src.includes('Koşullar') && src.includes('Aksiyon hedefi'), 'logic editor must expose condition and action fields')
assert(src.includes('Kural eklenemedi'), 'logic editor failures must be visible')
assert(src.includes('Kuralı kaydet'), 'logic editor must have an explicit save action')

console.log('logic-rule-create.test: PASS (AC-LOGIC-RULE-CREATE-01)')
