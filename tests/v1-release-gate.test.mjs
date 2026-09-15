import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const modules = readFileSync('src/lib/release-module.ts', 'utf8')
const publicForm = readFileSync('src/app/api/public/forms/[slug]/route.ts', 'utf8')
const publicSubmit = readFileSync('src/app/api/public/forms/[slug]/submissions/route.ts', 'utf8')
const decision = readFileSync('RELEASE-DECISION.md', 'utf8')

for (const capability of ['registration_forms', 'manual_payment_tracking', 'participant_notifications']) {
  assert(modules.includes(`'${capability}'`), `V1 must include ${capability}`)
}
for (const capability of ['online_payments', 'manual_invoices', 'parasut_invoices', 'transactional_invoice_delivery', 'subscription_billing']) {
  assert(modules.includes(`'${capability}'`), `roadmap must name ${capability}`)
}
assert(modules.includes('version_entitlement'), 'future modules must be closed by version entitlement')
assert(publicForm.includes('containsForbiddenKeys'), 'public form must enforce the allowlist snapshot boundary')
assert(publicSubmit.includes('publishedVersionId'), 'public submission must require a published snapshot')
assert(decision.includes('NO-GO'), 'global release gate must remain closed')
assert(decision.includes('production'), 'V1 gate must distinguish local proof from production')

console.log('v1-release-gate.test: PASS (AC-V1-05)')
