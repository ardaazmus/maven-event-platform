import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const matrix = readFileSync('docs/acceptance/v2-provider-evidence-matrix.md', 'utf8')

for (const value of ['iyzico Checkout Form', 'Stripe Checkout', 'Google Pay PAYMENT_GATEWAY', 'Google Pay DIRECT']) {
  assert(matrix.includes(value), `${value} must have a decision row`)
}
for (const field of ['supported', 'sandbox_ready', 'merchant_verified', 'production_eligible', 'decision']) {
  assert(matrix.includes(field), `${field} must be an evidence field`)
}
assert(matrix.includes('production_eligible=no'), 'V2-00 must keep production ineligible')
assert(matrix.includes('global R-10 `NO-GO`'), 'global release gate must remain closed')
assert(matrix.includes('raw body imzası'), 'webhook raw-body verification must be required')
assert(matrix.includes('PAN/CVV'), 'card data boundary must be explicit')
assert(!/sk_live_|sk_test_|whsec_|apiKey\s*[:=]/i.test(matrix), 'matrix must not contain provider secrets')

console.log('v2-provider-matrix.test: PASS (AC-V2-00)')
