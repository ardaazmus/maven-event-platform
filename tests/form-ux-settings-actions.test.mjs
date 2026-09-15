import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const settings = readFileSync('src/components/mavenforms/views/settings-view.tsx', 'utf8')
assert(settings.includes("const [editingTemplate, setEditingTemplate]"), 'settings must own the selected template editor state')
assert(settings.includes("onClick={() => setEditingTemplate(t)}"), 'Düzenle must open the selected template')
assert(settings.includes('<EmailTemplateEditor'), 'settings must render the template editor')
assert(settings.includes('template={editingTemplate}'), 'editor must receive the selected template')
assert(settings.includes('onClose={() => setEditingTemplate(null)}'), 'editor close action must clear state')
assert(settings.includes('setEditingTemplate(null)'), 'save/cancel must close the editor')
assert(settings.includes('kalıcı API kaydı henüz açık değil'), 'session-only template limitation must be visible')
console.log('form-ux-settings-actions.test: PASS')
