import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const editor = readFileSync('src/components/mavenforms/email-template-editor.tsx', 'utf8')
const settings = readFileSync('src/components/mavenforms/views/settings-view.tsx', 'utf8')

assert(editor.includes('guidance'), 'editor must receive template guidance metadata')
assert(editor.includes('Gönderim rehberi'), 'editor must show the sending guide')
assert(editor.includes('template.guidance.trigger'), 'editor must show the triggering event')
assert(editor.includes('template.guidance.recipient'), 'editor must show the recipient class')
assert(editor.includes('template.guidance.messageClass'), 'editor must show the message class')
assert(editor.includes('fatura veya ödeme kanıtı değildir'), 'editor must separate email from invoice/payment evidence')
assert(settings.includes('messageClass:'), 'settings must define message class metadata')
assert(settings.includes('recipient:'), 'settings must define recipient metadata')
assert(!editor.includes('SMTP_PASSWORD') && !editor.includes('providerToken'), 'editor must not expose credentials')

console.log('email-template-editor-context.test: PASS (MAIL-03-03)')
