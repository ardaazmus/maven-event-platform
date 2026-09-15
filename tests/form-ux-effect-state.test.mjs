import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const editor = readFileSync('src/components/mavenforms/email-template-editor.tsx', 'utf8')
const sourceField = readFileSync('src/components/mavenforms/media-source-field.tsx', 'utf8')
const settings = readFileSync('src/components/mavenforms/views/settings-view.tsx', 'utf8')

assert(!editor.includes('useEffect'), 'email editor must not reset draft state from an effect')
assert.match(editor, /useState\(\(\) => template\?\.subject/)
assert(!sourceField.includes('useEffect'), 'media source must not synchronize state from an effect')
assert.match(sourceField, /const source = mediaId \? 'library' : externalUrl \? 'external' : selectedSource/)
assert.match(settings, /<EmailTemplateEditor\s+key=\{editingTemplate\?\.name \|\| 'email-template-editor-closed'\}/)

console.log('form-ux-effect-state: PASS (derived source state and keyed template remount)')
