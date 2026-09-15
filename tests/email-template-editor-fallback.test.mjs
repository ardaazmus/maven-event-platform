import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const editor = readFileSync('src/components/mavenforms/email-template-editor.tsx', 'utf8')
const settings = readFileSync('src/components/mavenforms/views/settings-view.tsx', 'utf8')

assert(editor.includes('plainTextBody'), 'editor must own a separate plain-text fallback value')
assert(editor.includes('Düz metin yedeği'), 'editor must label the fallback field')
assert(editor.includes('textBody: plainTextBody'), 'preview must render the fallback body')
assert(editor.includes('onSave({ subject, body, plainTextBody })'), 'save callback must carry the fallback body')
assert(settings.includes('plainTextBody:'), 'template definitions must provide fallback content')
assert(!editor.includes('fetch(') && !editor.includes('/api/'), 'fallback editing must not call a provider or persistence API')

console.log('email-template-editor-fallback.test: PASS (MAIL-03-04)')
