import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const builder = readFileSync('src/components/mavenforms/views/forms-list-view.tsx', 'utf8')
const route = readFileSync('src/app/api/forms/route.ts', 'utf8')

assert(builder.includes('enableUserConfirmation'), 'new form flow must keep the confirmation selection')
assert(builder.includes('Katılımcıya yanıt alındı e-postası gönder'), 'new form flow must explain the confirmation option')
assert(builder.includes('enableUserConfirmation: newForm.enableUserConfirmation'), 'new form flow must send the selection to the server')
assert(route.includes('enableUserConfirmation: z.boolean().optional().default(false)'), 'create schema must default confirmation to off')
assert(route.includes('db.$transaction(async (tx) =>'), 'form and confirmation setup must be atomic')
assert(route.includes("tx.formField.create({ data: { formId: created.id, fieldKey: 'email', type: 'email'"), 'confirmation setup must create a public email field')
assert(route.includes("name: 'Kullanıcı Onayı',"), 'confirmation setup must create the notification')
assert(route.includes('if (enableUserConfirmation)'), 'confirmation records must be conditional')

console.log('form-create-confirmation.test: PASS (AC-FORM-CREATE-CONFIRMATION-01)')
