import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const dashboard = readFileSync('src/components/mavenforms/views/dashboard-view.tsx', 'utf8')

assert.match(dashboard, /onClick=\{\(\) => setView\('submissions'\)\} aria-label="Tüm yanıtları gör"/, 'recent submissions navigation needs an accessible name')
assert.match(dashboard, /title="Tüm yanıtları gör"/, 'recent submissions navigation needs a visible tooltip')

console.log('form-ux-dashboard-a11y.test: PASS')
