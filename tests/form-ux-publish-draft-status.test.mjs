import assert from 'node:assert/strict'
import fs from 'node:fs'

const source = fs.readFileSync('src/components/mavenforms/views/form-builder-view.tsx', 'utf8')

assert.match(source, /const \[hasUnsavedChanges, setHasUnsavedChanges\] = useState\(false\)/, 'builder must track unsaved form changes')
assert.match(source, /Yayınlanmamış değişiklikler var/, 'published forms must disclose unpublished changes')
assert.match(source, /setHasUnsavedChanges\(true\)/, 'form title/settings edits must mark the draft')
assert.match(source, /form\.status === 'published' && hasUnsavedChanges/, 'draft label must be conditional on published status')

console.log('FORM-UX-52 publish draft status checks passed')
