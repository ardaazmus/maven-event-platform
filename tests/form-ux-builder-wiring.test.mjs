import assert from 'node:assert/strict'
import fs from 'node:fs'

const builder = fs.readFileSync('src/components/mavenforms/views/form-builder-view.tsx', 'utf8')
const publicPage = fs.readFileSync('src/app/forms/[slug]/page.tsx', 'utf8')

for (const tab of ['fields', 'settings', 'appearance', 'submissions', 'logic', 'notifications', 'embed', 'payment', 'integrations', 'reports']) {
  assert.match(builder, new RegExp(`id: '${tab}'`), `builder tab missing: ${tab}`)
}

assert.match(builder, /formDetailTab === 'theme' \? 'appearance'/, 'legacy theme selection must resolve to the unified appearance workspace')
assert.doesNotMatch(builder, /id: 'theme', label: 'Tema'/, 'builder must not expose a competing visible theme tab')
assert.match(builder, /onClick=\{\(\) => setActiveTab\(t\.id\)\}/, 'builder tabs must update active state')
assert.match(builder, /<FieldPalette[\s\S]*onAdd=\{addField\}/s, 'field palette must be connected to field creation')
assert.match(builder, /<BuilderCanvas[\s\S]*onDelete=\{deleteField\}[\s\S]*onDuplicate=\{duplicateField\}[\s\S]*onUpdate=\{updateField\}/s, 'canvas actions must be connected to server-backed handlers')
assert.match(builder, /<PropertiesPanel[\s\S]*onUpdate=\{updateField\}[\s\S]*onDelete=\{deleteField\}/s, 'properties panel actions must be connected')
assert.match(builder, /api\(`\/api\/forms\/\$\{form\.id\}\/publish`/, 'publish must call the server route')
assert.match(builder, /activeTab === 'preview'/, 'preview must be a real builder surface')
assert.match(builder, /\/forms\/\$\{encodeURIComponent\(form\.slug\)\}\?preview=1/, 'preview must use the authenticated draft preview route')
assert.match(builder, /ComingSoonPanel/, 'unsupported integrations must remain visibly deferred instead of pretending to work')
assert.match(publicPage, /query\.preview === '1'[\s\S]*getSessionFromCookie/s, 'draft preview must require an authenticated session')

console.log('form-ux-builder-wiring.test: PASS')
