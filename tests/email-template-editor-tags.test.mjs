import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const editor = readFileSync('src/components/mavenforms/email-template-editor.tsx', 'utf8')
const content = readFileSync('src/lib/email-template-content.ts', 'utf8')

assert(editor.includes('EMAIL_TEMPLATE_MERGE_TAGS'), 'editor must use the canonical safe tag list')
assert(editor.includes('insertTag'), 'editor must expose a tag insertion action')
assert(editor.includes("target === 'subject'"), 'editor must support subject targeting')
assert(editor.includes('Konuya ekle'), 'editor must expose subject target')
assert(editor.includes('Gövdeye ekle'), 'editor must expose body target')
assert(editor.includes('tag.description'), 'editor must explain each safe tag')
assert(content.includes("'form.name'") && content.includes("'payment.status'"), 'canonical content allowlist must remain present')
assert(!editor.includes('provider.secret') && !editor.includes('raw_card'), 'editor must not expose provider or card fields')

console.log('email-template-editor-tags.test: PASS (MAIL-03-01)')
