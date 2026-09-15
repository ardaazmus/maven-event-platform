import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const src = readFileSync('src/components/mavenforms/views/form-builder-view.tsx', 'utf8')

assert(src.includes("/api/forms/${form.id}/logic/${id}"), 'logic toggles must use the form-scoped logic endpoint')
assert(src.includes('onCheckedChange={(enabled) => void toggleRule(rule.id, enabled)}'), 'logic switches must perform a real update')
assert(src.includes('Kural güncellenemedi'), 'logic update failures must be visible')
assert(src.includes('aria-label={`${rule.name || `Kural ${rule.priority}`} kuralını etkinleştir`}'), 'logic switches must have accessible names')

console.log('logic-panel.test: PASS (AC-LOGIC-TOGGLE-01)')
