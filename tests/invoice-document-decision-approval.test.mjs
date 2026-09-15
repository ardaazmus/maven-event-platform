import assert from 'node:assert/strict'
import { approveInvoiceDocumentDecision } from '../src/lib/invoice-document-decision-approval.ts'

const base = { workspaceId: 'workspace-1', invoiceDocumentId: 'document-1', invoiceRecordId: 'invoice-1', candidateId: 'invoice-1', strategy: 'payment_reference', approvalStatus: 'approved', approvedById: 'admin-1' }

function client({ document = true, candidate = true } = {}) {
  const calls = []
  return {
    calls,
    invoiceDocument: { async findFirst(query) { calls.push(['document.findFirst', query]); return document ? { id: 'document-1' } : null } },
    invoiceRecord: { async findFirst(query) { calls.push(['invoice.findFirst', query]); return candidate ? { id: 'invoice-1' } : null } },
  }
}

const saved = []
const result = await approveInvoiceDocumentDecision(base, client(), async input => { saved.push(input); return { status: 'created', decisionId: 'decision-1' } })
assert.deepEqual(result, { status: 'created', decisionId: 'decision-1' })
assert.deepEqual(saved[0], { workspaceId: base.workspaceId, invoiceDocumentId: base.invoiceDocumentId, invoiceRecordId: base.invoiceRecordId, matchStatus: 'matched', matchStrategy: 'payment_reference', matchedInvoiceRecordId: 'invoice-1', approvalStatus: 'approved', approvedById: 'admin-1' })
assert.equal(saved[0].workspaceId, 'workspace-1')

assert.deepEqual(await approveInvoiceDocumentDecision({ ...base, candidateId: 'other-invoice' }, client(), async () => { throw new Error('must not save') }), { status: 'blocked', reason: 'scope_mismatch' })
assert.deepEqual(await approveInvoiceDocumentDecision({ ...base, strategy: 'not-a-strategy' }, client(), async () => { throw new Error('must not save') }), { status: 'blocked', reason: 'input_invalid' })
assert.deepEqual(await approveInvoiceDocumentDecision(base, client({ document: false }), async () => { throw new Error('must not save') }), { status: 'blocked', reason: 'scope_mismatch' })
assert.deepEqual(await approveInvoiceDocumentDecision(base, client({ candidate: false }), async () => { throw new Error('must not save') }), { status: 'blocked', reason: 'scope_mismatch' })

console.log('invoice-document-decision-approval.test: PASS (P-12C-09)')
