import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const editor = readFileSync('src/components/mavenforms/email-template-editor.tsx', 'utf8')

assert.match(editor, /hasUnsavedChanges/)
assert.match(editor, /Kaydedilmemiş değişiklikler var/)
assert.match(editor, /Değişiklikleri geri al/)
assert.match(editor, /setPlainTextBody\(template\.plainTextBody \|\| template\.body \|\| ''\)/)
assert.doesNotMatch(editor, /fetch\(|\/api\//)

console.log('email-template-editor-draft-state: PASS')
