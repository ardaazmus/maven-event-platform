import assert from 'node:assert/strict'
import { FUTURE_INVOICE_STEPS, futureInvoiceCapability } from '../src/components/mavenforms/future-invoice-wizard.tsx'
import { readFileSync } from 'node:fs'

assert.deepEqual(FUTURE_INVOICE_STEPS.map(step => step.id), ['provider', 'scope', 'evidence', 'review'])
assert.deepEqual(futureInvoiceCapability(), { enabled: false, reason: 'automatic_documents_disabled' })
assert.deepEqual(futureInvoiceCapability({ automatedDocumentsEnabled: true, evidenceStatus: 'local' }), { enabled: false, reason: 'legal_evidence_required' })
assert.deepEqual(futureInvoiceCapability({ automatedDocumentsEnabled: true, evidenceStatus: 'external' }), { enabled: true, reason: 'ready_for_separate_release_gate' })
assert.deepEqual(futureInvoiceCapability({ automatedDocumentsEnabled: 'true', evidenceStatus: 'external' }), { enabled: false, reason: 'automatic_documents_disabled' })

const center = readFileSync('src/components/mavenforms/views/invoice-center-view.tsx', 'utf8')
assert(center.includes("import { FutureInvoiceWizard }"), 'invoice center must import future invoice wizard')
assert(center.includes('<FutureInvoiceWizard />'), 'invoice center must expose future invoice wizard')

const source = readFileSync('src/components/mavenforms/future-invoice-wizard.tsx', 'utf8')
for (const marker of ['Paraşüt API v4', 'Otomatik e-belge kapalı', 'Manuel fatura yükle', 'ayrı release kapısı']) {
  assert(source.includes(marker), `future invoice wizard missing ${marker}`)
}
assert.equal(source.includes('fetch('), false)
assert.equal(source.includes('db.'), false)
assert.equal(source.includes('credentialsEnvelope'), false)
assert.equal(source.includes('send('), false)

console.log('future-invoice-wizard.test: PASS (R10-V4-27)')
