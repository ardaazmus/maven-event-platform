import assert from 'node:assert/strict'
import { MANUAL_INVOICE_STEPS } from '../src/components/mavenforms/manual-invoice-wizard.tsx'
import { readFileSync } from 'node:fs'

assert.deepEqual(MANUAL_INVOICE_STEPS.map(step => step.id), ['upload', 'match', 'approve', 'document_ready'])
assert.equal(MANUAL_INVOICE_STEPS[0].label, 'Yükle')
assert.equal(MANUAL_INVOICE_STEPS[3].label, 'Hazır')

const center = readFileSync('src/components/mavenforms/views/invoice-center-view.tsx', 'utf8')
assert(center.includes("import { ManualInvoiceWizard }"), 'invoice center must import manual invoice wizard')
assert(center.includes("<ManualInvoiceWizard phase={rows.length ? 'match' : 'upload'} />"), 'invoice center must expose workflow phase')

const source = readFileSync('src/components/mavenforms/manual-invoice-wizard.tsx', 'utf8')
for (const marker of ['private karantinaya', 'Yetkili kullanıcı', 'document-ready', 'Otomatik fatura kapalı']) {
  assert(source.includes(marker), `manual invoice wizard missing ${marker}`)
}
assert.equal(source.includes('fetch('), false)
assert.equal(source.includes('db.'), false)
assert.equal(source.includes('send('), false)

console.log('manual-invoice-wizard.test: PASS (R10-V4-26)')
