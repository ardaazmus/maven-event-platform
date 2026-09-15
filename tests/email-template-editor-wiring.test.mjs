import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const settings = readFileSync('src/components/mavenforms/views/settings-view.tsx', 'utf8')
const editor = readFileSync('src/components/mavenforms/email-template-editor.tsx', 'utf8')

assert(settings.includes('EmailTemplateEditor'), 'settings must render the template editor')
assert(settings.includes('setEditingTemplate'), 'settings must own selected template state')
assert(settings.includes('onClick={() => setEditingTemplate(t)}'), 'edit buttons must open the selected template')
assert(editor.includes('Dialog'), 'editor must use the accessible dialog primitive')
assert(editor.includes('Kalıcı kayıt'), 'editor must disclose that persistence is not opened in this micro-phase')
assert(editor.includes('onSave'), 'editor must expose a draft save callback')

console.log('email-template-editor-wiring.test: PASS (MAIL-03-00)')
