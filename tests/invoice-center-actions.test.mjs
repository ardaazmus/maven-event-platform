import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const view = readFileSync('src/components/mavenforms/views/invoice-center-view.tsx', 'utf8')
const forms = readFileSync('src/components/mavenforms/views/forms-list-view.tsx', 'utf8')
assert(view.includes('/api/invoices/export'), 'invoice center export must use the server export endpoint')
assert(view.includes('/api/invoices/import'), 'invoice center import must use the server import endpoint')
assert(view.includes('disabled={!eligibleSelected.length'), 'export must be disabled without eligible selection')
assert(view.includes('Toplu gönderim endpoint'), 'unsupported send action must show a disabled reason')
assert(view.includes('payment.status') && view.includes('invoice.state') && view.includes('row.deliveries'), 'payment, invoice and delivery axes must remain separate')
assert(forms.includes('<InvoiceCenterView formId={focusedForm.id} />'), 'invoice center must be reachable from the selected form workspace')
assert(!view.includes('cardNumber') && !view.includes('providerSecret'), 'invoice center must not reference card or provider secret fields')

console.log('invoice-center-actions.test: PASS (R-03)')
