import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const view = readFileSync('src/components/mavenforms/views/forms-list-view.tsx', 'utf8')

assert.match(view, /DialogDescription/, 'new form dialog must import and render DialogDescription')
assert.match(view, /<DialogDescription>[\s\S]*Form türünü/, 'new form dialog must explain its purpose')
assert.match(view, /<DialogTitle[\s\S]*Yeni Form Oluştur/, 'new form dialog title must remain present')

console.log('form-ux-dialog-a11y.test: PASS')
