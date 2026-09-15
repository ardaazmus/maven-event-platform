import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const renderer = readFileSync('src/components/mavenforms/public-form-renderer.tsx', 'utf8')

assert.match(renderer, /aria-label=\{`\$\{i \+ 1\} yıldız`\}/, 'rating controls need an accessible name')
assert.match(renderer, /role="group" aria-label="Puanlama"/, 'rating controls need a named group')
assert.match(renderer, /aria-pressed=\{\(i \+ 1\) === Number\(value \|\| 0\)\}/, 'rating controls need selected-state semantics')
assert.match(renderer, /title=\{`\$\{i \+ 1\} yıldız`\}/, 'rating controls need a visible tooltip')
assert.match(renderer, /onClick=\{\(\) => onChange\(i \+ 1\)\}/, 'rating value change behavior must remain wired')

console.log('form-ux-public-rating-a11y.test: PASS')
