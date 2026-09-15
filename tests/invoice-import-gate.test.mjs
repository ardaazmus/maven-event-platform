import assert from 'node:assert/strict'
import { evaluateInvoiceImportGate } from '../src/lib/invoice-import-gate.ts'

const complete = { 'I-00': 'pass', 'I-01': 'pass', 'I-02': 'pass', 'I-03': 'pass', 'I-04': 'pass', 'I-05': 'pass' }

assert.deepEqual(evaluateInvoiceImportGate({ phaseStatuses: complete, previewCanApply: true }), {
  enabled: true,
  reason: 'ready',
  requiredPhases: ['I-00', 'I-01', 'I-02', 'I-03', 'I-04', 'I-05'],
})

assert.deepEqual(evaluateInvoiceImportGate({ phaseStatuses: { ...complete, 'I-05': 'blocked' }, previewCanApply: true }), {
  enabled: false,
  reason: 'history_incomplete',
  requiredPhases: ['I-00', 'I-01', 'I-02', 'I-03', 'I-04', 'I-05'],
})

assert.deepEqual(evaluateInvoiceImportGate({ phaseStatuses: { ...complete, 'I-04': 'unverified' }, previewCanApply: true }), {
  enabled: false,
  reason: 'history_incomplete',
  requiredPhases: ['I-00', 'I-01', 'I-02', 'I-03', 'I-04', 'I-05'],
})

assert.deepEqual(evaluateInvoiceImportGate({ phaseStatuses: complete, previewCanApply: false }), {
  enabled: false,
  reason: 'preview_blocked',
  requiredPhases: ['I-00', 'I-01', 'I-02', 'I-03', 'I-04', 'I-05'],
})

assert.deepEqual(evaluateInvoiceImportGate({ phaseStatuses: { ...complete, 'I-06': 'pass' }, previewCanApply: true }), {
  enabled: false,
  reason: 'history_incomplete',
  requiredPhases: ['I-00', 'I-01', 'I-02', 'I-03', 'I-04', 'I-05'],
})

console.log('invoice-import-gate.test: PASS (INV/F-I-06-01)')
