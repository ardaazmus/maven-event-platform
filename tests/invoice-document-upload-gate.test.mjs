import assert from 'node:assert/strict'
import { evaluateInvoiceDocumentUploadGate, requiredInvoiceDocumentPhases } from '../src/lib/invoice-document-upload-gate.ts'

assert.deepEqual(requiredInvoiceDocumentPhases, ['U-00', 'U-01', 'U-02', 'U-03', 'U-04'])

const passed = Object.fromEntries(requiredInvoiceDocumentPhases.map(phase => [phase, 'pass']))
assert.deepEqual(evaluateInvoiceDocumentUploadGate({ phaseStatuses: passed, documentReadyAllowed: true }), {
  enabled: true, canDownload: true, canDeliver: true,
})
assert.deepEqual(evaluateInvoiceDocumentUploadGate({ phaseStatuses: { ...passed, 'U-03': 'unverified' }, documentReadyAllowed: true }), {
  enabled: false, canDownload: false, canDeliver: false, reason: 'phase_gate',
})
assert.deepEqual(evaluateInvoiceDocumentUploadGate({ phaseStatuses: passed, documentReadyAllowed: false }), {
  enabled: false, canDownload: false, canDeliver: false, reason: 'document_not_ready',
})
assert.deepEqual(evaluateInvoiceDocumentUploadGate({ phaseStatuses: { ...passed, 'U-05': 'pass' }, documentReadyAllowed: true }), {
  enabled: false, canDownload: false, canDeliver: false, reason: 'phase_gate',
})
assert.deepEqual(evaluateInvoiceDocumentUploadGate({ phaseStatuses: {}, documentReadyAllowed: true }), {
  enabled: false, canDownload: false, canDeliver: false, reason: 'phase_gate',
})

console.log('invoice-document-upload-gate.test: PASS (INV/F-U-05-01)')
