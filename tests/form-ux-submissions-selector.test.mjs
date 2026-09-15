import assert from 'node:assert/strict'
import fs from 'node:fs'

const source = fs.readFileSync('src/components/mavenforms/views/submissions-view.tsx', 'utf8')

assert.match(source, /<button\s+type="button"\s+key=\{form\.id\}/, 'form selector items must be semantic buttons')
assert.match(source, /aria-current=\{selectedForm === form\.id \? 'page' : undefined\}/, 'selected form must be announced')
assert.match(source, /setSelectedForm\(form\.id\); setPage\(1\)/, 'selector must preserve form switch and pagination reset')
assert.match(source, /selectedForm === form\.id/, 'selector must retain visible active state')
assert.match(source, /current\.title.*canlı form/s, 'selected form live surface must remain in results')

console.log('FORM-UX-42 submissions selector checks passed')
