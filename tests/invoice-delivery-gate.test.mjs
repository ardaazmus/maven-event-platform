import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { evaluateInvoiceEmailGate, requiredInvoiceEmailPhases } from '../src/lib/invoice-delivery-gate.ts'

const source = readFileSync('src/lib/invoice-delivery-gate.ts', 'utf8')
assert(source.includes('evaluateInvoiceDocumentUploadGate'), 'email gate must reuse the document upload gate')
assert(source.includes('documentReadyAllowed'), 'email gate must require document-ready evidence')
assert(source.includes('transactional'), 'invoice delivery must remain transactional')
assert(source.includes('suppressed'), 'email gate must check suppression')

assert.deepEqual(requiredInvoiceEmailPhases, ['E-00', 'E-01', 'E-02', 'E-03'])
const emailPhases = Object.fromEntries(requiredInvoiceEmailPhases.map(phase => [phase, 'pass']))
const documentPhases = Object.fromEntries(['U-00', 'U-01', 'U-02', 'U-03', 'U-04'].map(phase => [phase, 'pass']))
const base = {
  emailPhaseStatuses: emailPhases,
  documentPhaseStatuses: documentPhases,
  documentReadyAllowed: true,
  messageClass: 'transactional',
  recipientPresent: true,
  suppressed: false,
  deliveryIntentStatus: 'queued',
  outboxStatus: 'queued',
}

assert.deepEqual(evaluateInvoiceEmailGate(base), { enabled: true, canDeliver: true })
assert.deepEqual(evaluateInvoiceEmailGate({ ...base, emailPhaseStatuses: { ...emailPhases, 'E-02': 'unverified' } }), { enabled: false, canDeliver: false, reason: 'email_phase_gate' })
assert.deepEqual(evaluateInvoiceEmailGate({ ...base, documentPhaseStatuses: { ...documentPhases, 'U-03': 'blocked' } }), { enabled: false, canDeliver: false, reason: 'document_phase_gate' })
assert.deepEqual(evaluateInvoiceEmailGate({ ...base, documentReadyAllowed: false }), { enabled: false, canDeliver: false, reason: 'document_not_ready' })
assert.deepEqual(evaluateInvoiceEmailGate({ ...base, messageClass: 'notification' }), { enabled: false, canDeliver: false, reason: 'message_class_invalid' })
assert.deepEqual(evaluateInvoiceEmailGate({ ...base, recipientPresent: false }), { enabled: false, canDeliver: false, reason: 'recipient_missing' })
assert.deepEqual(evaluateInvoiceEmailGate({ ...base, suppressed: true }), { enabled: false, canDeliver: false, reason: 'recipient_suppressed' })
assert.deepEqual(evaluateInvoiceEmailGate({ ...base, deliveryIntentStatus: 'sent' }), { enabled: false, canDeliver: false, reason: 'delivery_not_queued' })
assert.deepEqual(evaluateInvoiceEmailGate({ ...base, outboxStatus: 'dead' }), { enabled: false, canDeliver: false, reason: 'outbox_not_dispatchable' })

console.log('invoice-delivery-gate.test: PASS (INV/F-E-04-01)')
