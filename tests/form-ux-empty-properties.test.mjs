import assert from 'node:assert/strict'
import fs from 'node:fs'

const source = fs.readFileSync('src/components/mavenforms/builder/properties-panel.tsx', 'utf8')

assert.match(source, /Alan seçilmedi/, 'empty properties state must identify that no field is selected')
assert.match(source, /canvas'tan bir alan seçin/, 'empty properties state must explain how to select a field')
assert.match(source, /Alan eklemek için sol panelden bir alanı canvas'a sürükleyin/, 'empty properties state must explain the add-field route')
assert.match(source, /aria-hidden="true"/, 'decorative empty-state icon must be hidden from assistive technology')
assert.match(source, /min-w-0/, 'empty properties state must remain shrinkable on narrow layouts')

console.log('FORM-UX-39 empty properties checks passed')
