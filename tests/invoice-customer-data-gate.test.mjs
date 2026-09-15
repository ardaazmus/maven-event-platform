import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const plan = readFileSync('docs/superpowers/plans/2026-09-02-mavenforms-e-belge-15-dakikalik-uygulama-paketleri.md', 'utf8')
const executionPlan = readFileSync('AI-RELEASE-EXECUTION-PLAN.md', 'utf8')
assert(plan.includes('### C-04 — Müşteri veri kapısı'), 'C-04 must remain an explicit gate')
assert(executionPlan.includes('manuel export veya Paraşüt fatura oluşturma'), 'main plan must retain the customer-data gate')
assert.equal(existsSync('src/app/api/invoices/export/route.ts'), true, 'manual export must open only after candidate and mapper phases')
assert.equal(existsSync('src/app/api/invoices/parasut/route.ts'), false, 'Paraşüt issue must not open before provider phase')
assert(plan.includes('### X-05 — Export endpoint'), 'X-05 export endpoint must remain an explicit phase')
assert(plan.includes('### X-06 — Manuel export kapısı'), 'X-06 must remain the next manual export gate')

console.log('invoice-customer-data-gate.test: PASS (INV/F-C-04-X-05-01)')
