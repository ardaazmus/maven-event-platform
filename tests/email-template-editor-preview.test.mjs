import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const editor = readFileSync('src/components/mavenforms/email-template-editor.tsx', 'utf8')

assert(editor.includes('renderEmailTemplateContent'), 'preview must use the canonical safe renderer')
assert(editor.includes('showPreview'), 'editor must own preview visibility')
assert(editor.includes('Önizleme'), 'editor must expose a preview action')
assert(editor.includes('Örnek veri'), 'preview must disclose synthetic values')
assert(editor.includes('previewError'), 'preview must surface invalid content without sending')
assert(!editor.includes('fetch(') && !editor.includes('/api/'), 'preview must not call provider or persistence API')

console.log('email-template-editor-preview.test: PASS (MAIL-03-02)')
