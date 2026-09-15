import assert from 'node:assert/strict'
import { buildInvoiceDocumentReadyTransition } from '../src/lib/invoice-document-ready-transition.ts'

const base = {
  match: { status: 'matched', strategy: 'payment_reference', candidateId: 'invoice-1', requiresManualApproval: true },
  approvalStatus: 'approved',
  invoiceRecordId: 'invoice-1',
  matchedInvoiceRecordId: 'invoice-1',
  invoiceState: 'issued',
  scanStatus: 'clean',
  documentState: 'quarantined',
}

assert.deepEqual(buildInvoiceDocumentReadyTransition(base), {
  status: 'ready', invoiceState: 'document_ready', documentState: 'quarantined', readyAtRequired: true,
})
assert.deepEqual(buildInvoiceDocumentReadyTransition({ ...base, approvalStatus: 'pending' }), { status: 'blocked', reason: 'approval_required' })
assert.deepEqual(buildInvoiceDocumentReadyTransition({ ...base, matchedInvoiceRecordId: 'other-invoice' }), { status: 'blocked', reason: 'match_not_safe' })
assert.deepEqual(buildInvoiceDocumentReadyTransition({ ...base, scanStatus: 'pending' }), { status: 'blocked', reason: 'scan_required' })
assert.deepEqual(buildInvoiceDocumentReadyTransition({ ...base, invoiceState: 'document_ready' }), { status: 'blocked', reason: 'invoice_not_issued' })
assert.deepEqual(buildInvoiceDocumentReadyTransition({ ...base, documentState: 'ready' }), { status: 'blocked', reason: 'document_state_invalid' })

console.log('invoice-document-ready-transition.test: PASS (P-12C-01)')
