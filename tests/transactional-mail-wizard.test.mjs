import assert from 'node:assert/strict'
import { TRANSACTIONAL_MAIL_STEPS, transactionalMailCapability } from '../src/components/mavenforms/transactional-mail-wizard.tsx'
import { readFileSync } from 'node:fs'

assert.deepEqual(TRANSACTIONAL_MAIL_STEPS.map(step => step.id), ['channel', 'document', 'sender', 'release'])
assert.deepEqual(transactionalMailCapability(), { enabled: false, reason: 'email_phase_gate' })
assert.deepEqual(transactionalMailCapability({ emailHistoryComplete: true }), { enabled: false, reason: 'document_not_ready' })
assert.deepEqual(transactionalMailCapability({ emailHistoryComplete: true, invoiceSource: 'parasut_v4' }), { enabled: false, reason: 'invoice_source_deferred' })
assert.deepEqual(transactionalMailCapability({ emailHistoryComplete: true, messageClass: 'notification' }), { enabled: false, reason: 'message_class_invalid' })
assert.deepEqual(transactionalMailCapability({ emailHistoryComplete: true, documentReady: true, senderHealthy: true, recipientPresent: true, outboxDispatchable: true }), { enabled: true, reason: 'ready_for_r10_release_gate' })

const center = readFileSync('src/components/mavenforms/views/invoice-center-view.tsx', 'utf8')
assert(center.includes("import { TransactionalMailWizard }"), 'invoice center must import transactional mail wizard')
assert(center.includes('<TransactionalMailWizard />'), 'invoice center must expose transactional mail wizard')

const source = readFileSync('src/components/mavenforms/transactional-mail-wizard.tsx', 'utf8')
for (const marker of ['transactional fatura maili', 'ayrı notification kanalı', 'ayrı fatura sender profili', 'Document-ready', 'R-10']) {
  assert(source.includes(marker), `transactional mail wizard missing ${marker}`)
}
assert.equal(source.includes('fetch('), false)
assert.equal(source.includes('db.'), false)
assert.equal(source.includes('credentialsEnvelope'), false)
assert.equal(source.includes('send('), false)

console.log('transactional-mail-wizard.test: PASS (R10-V4-28)')
