import assert from 'node:assert/strict'
import fs from 'node:fs'

const source = fs.readFileSync('src/components/mavenforms/views/forms-list-view.tsx', 'utf8')

assert.match(source, /<button\s+type="button"[\s\S]*?onClick=\{\(\) => setSelectedFolder\(null\)\}/, 'all forms selector must be a non-submit button')
assert.match(source, /aria-current=\{!selectedFolder \? 'page' : undefined\}/, 'selected all forms state must be announced')
assert.match(source, /type="button"[\s\S]*?onClick=\{\(\) => setSelectedFolder\(folder\.id\)\}/, 'folder selectors must be non-submit buttons')
assert.match(source, /aria-current=\{selectedFolder === folder\.id \? 'page' : undefined\}/, 'selected folder state must be announced')
assert.match(source, /\{tag\.name\}/, 'tags must remain visible as metadata')
assert.match(source, /className="inline-flex items-center gap-0\.5 px-2 py-0\.5 rounded-full text-\[11px\] font-medium border"/, 'unsupported tag navigation must not look clickable')

console.log('FORM-UX-49 list navigation checks passed')
