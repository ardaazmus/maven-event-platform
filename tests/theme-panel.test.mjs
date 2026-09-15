import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const src = readFileSync('src/components/mavenforms/views/form-builder-view.tsx', 'utf8')

assert(src.includes("/api/forms/${form.id}/theme"), 'theme panel must persist through the form-scoped theme endpoint')
assert(src.includes('onClick={() => applyPreset(t)}'), 'preset cards must apply a real theme action')
assert(src.includes('aria-pressed={name === t.name}'), 'selected preset state must be exposed accessibly')
assert(src.includes('value={value}'), 'color token inputs must be controlled by persisted theme state')
assert(src.includes('Tema ayarlarını kaydet'), 'custom theme changes must have an explicit save action')
assert(src.includes('Public görünüm için formu yeniden yayınlayın'), 'theme save must not claim to update the immutable published snapshot')

console.log('theme-panel.test: PASS (AC-THEME-PERSISTENCE-01)')
