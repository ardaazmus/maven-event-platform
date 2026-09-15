import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const helper = readFileSync('src/lib/publication-consistency.ts', 'utf8')
const card = readFileSync('src/components/mavenforms/builder/publication-consistency-card.tsx', 'utf8')
const builder = readFileSync('src/components/mavenforms/views/form-builder-view.tsx', 'utf8')

assert.match(helper, /getPublicationConsistencyChecks/, 'publication consistency helper must be present')
assert.match(helper, /date-title/, 'title and date mismatch must be surfaced')
assert.match(helper, /cover-alt/, 'selected cover without alt text must be surfaced')
assert.match(helper, /state: 'warning'/, 'non-blocking consistency findings must be warnings')
assert.match(card, /Yayın öncesi kontrol/, 'builder must expose publication preflight guidance')
assert.match(card, /aria-live="polite"/, 'changing checks must be announced accessibly')
assert.match(builder, /<PublicationConsistencyCard form=\{form\} \/>/, 'settings panel must render the consistency card')

console.log('form-ux-publication-consistency.test: PASS')
