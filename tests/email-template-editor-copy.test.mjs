import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const editor = readFileSync('src/components/mavenforms/email-template-editor.tsx', 'utf8')
const settings = readFileSync('src/components/mavenforms/views/settings-view.tsx', 'utf8')

assert.match(editor, /onDuplicate: \(draft: Pick<EmailTemplateDefinition, 'subject' \| 'body' \| 'plainTextBody'>\) => void/)
assert.match(editor, /Kopyasını oluştur/)
assert.match(editor, /onDuplicate\(\{ subject, body, plainTextBody \}\)/)
assert.match(settings, /onDuplicate=\{draft => \{/)
assert.match(settings, /setTemplates\(current => \[\.\.\.current/)
assert.match(settings, /oturum taslağı/)
assert.doesNotMatch(editor, /fetch\(|\/api\//)

console.log('email-template-editor-copy: PASS')
