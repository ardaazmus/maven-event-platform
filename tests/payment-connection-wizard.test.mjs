import assert from 'node:assert/strict'
import { normalizePaymentWizardAmount } from '../src/components/mavenforms/payment-connection-wizard.tsx'
import { readFileSync } from 'node:fs'

assert.equal(normalizePaymentWizardAmount(125.678), 125.68)
assert.equal(normalizePaymentWizardAmount(0), null)
assert.equal(normalizePaymentWizardAmount(-1), null)
assert.equal(normalizePaymentWizardAmount('125'), null)
assert.equal(normalizePaymentWizardAmount(1_000_001), null)

const panel = readFileSync('src/components/mavenforms/views/form-builder-view.tsx', 'utf8')
assert(panel.includes("import { PaymentConnectionWizard }"), 'payment wizard must be imported by builder')
assert(panel.includes('<PaymentConnectionWizard />'), 'payment wizard must be visible in payment panel')

const source = readFileSync('src/components/mavenforms/payment-connection-wizard.tsx', 'utf8')
for (const marker of ['Hosted checkout', 'sunucu tarafı webhook', 'R-10 gerekli', 'data-payment-wizard-state']) {
  assert(source.includes(marker), `payment wizard missing ${marker}`)
}
assert.equal(source.includes('fetch('), false)
assert.equal(source.includes('db.'), false)
assert.equal(source.includes('credentials'), false)

console.log('payment-connection-wizard.test: PASS (R10-V4-25)')
