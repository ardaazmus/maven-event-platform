import assert from 'node:assert/strict'
import fs from 'node:fs'

const packagePlan = fs.readFileSync('docs/superpowers/plans/2026-09-02-mavenforms-e-belge-15-dakikalik-uygulama-paketleri.md', 'utf8')
const executionPlan = fs.readFileSync('AI-RELEASE-EXECUTION-PLAN.md', 'utf8')

for (const phase of ['D-00', 'D-01', 'D-02', 'D-03', 'D-04']) {
  assert(packagePlan.includes(`### ${phase}`) || packagePlan.includes(`**Aktif paket:** \`${phase}`), `${phase} must remain in the invoice plan`)
}

assert(packagePlan.includes('Gerçek Stripe/iyzico sandbox hesabı'))
assert(packagePlan.includes('DEFERRED_BY_PRODUCT_OWNER'))
assert(packagePlan.includes('credential’sız'))
assert(packagePlan.includes('Prisma modeli eklenmez'))
assert(executionPlan.includes('C-02 — Payment snapshot’a bağlama'))
assert(packagePlan.includes('### M-00 — Recipient snapshot modeli'))
assert(packagePlan.includes('### M-01 — InvoiceRecord modeli'))
assert(executionPlan.includes('PAYMENT_LIVE_ENABLED=true'))

console.log('PASS invoice-decision-gate tests')
