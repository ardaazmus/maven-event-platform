import assert from 'node:assert/strict'
import { persistInvoiceDocumentReady } from '../src/lib/invoice-document-ready-persistence.ts'

const base = {
  workspaceId: 'workspace-1', invoiceRecordId: 'invoice-1', documentId: 'document-1',
  match: { status: 'matched', strategy: 'payment_reference', candidateId: 'invoice-1', requiresManualApproval: true },
  approvalStatus: 'approved', approvedById: 'admin-1',
}

function client({ invoiceState = 'issued', readyAt = null, document = true, decision = { matchStatus: 'matched', matchStrategy: 'payment_reference', matchedInvoiceRecordId: 'invoice-1', approvalStatus: 'approved', approvedById: 'admin-1' } } = {}) {
  const calls = []
  return {
    calls,
    async $transaction(work) {
      return work({
        invoiceDocument: {
          async findFirst(query) { calls.push(['document.findFirst', query]); return document ? { id: 'document-1', state: 'quarantined', scanStatus: 'clean', readyAt, invoiceRecord: { id: 'invoice-1', state: invoiceState } } : null },
          async updateMany(query) { calls.push(['document.updateMany', query]); return { count: 1 } },
        },
        invoiceDocumentDecision: {
          async findFirst(query) { calls.push(['decision.findFirst', query]); return decision },
        },
        invoiceRecord: { async updateMany(query) { calls.push(['invoice.updateMany', query]); return { count: 1 } } },
        auditLog: { async create(query) { calls.push(['audit.create', query]); return { id: 'audit-1' } } },
      })
    },
  }
}

const readyClient = client()
assert.deepEqual(await persistInvoiceDocumentReady(base, readyClient), { status: 'ready', invoiceRecordId: 'invoice-1', documentId: 'document-1' })
assert.equal(readyClient.calls.filter(([name]) => name === 'audit.create').length, 1)
assert.equal(readyClient.calls.find(([name]) => name === 'invoice.updateMany')[1].where.state, 'issued')

assert.deepEqual(await persistInvoiceDocumentReady(base, client({ invoiceState: 'document_ready', readyAt: new Date() })), { status: 'duplicate', invoiceRecordId: 'invoice-1', documentId: 'document-1' })
assert.deepEqual(await persistInvoiceDocumentReady({ ...base, approvalStatus: 'pending' }, client()), { status: 'blocked', reason: 'decision_conflict' })
assert.deepEqual(await persistInvoiceDocumentReady({ ...base, match: { ...base.match, candidateId: 'other-invoice' } }, client()), { status: 'blocked', reason: 'decision_conflict' })
assert.deepEqual(await persistInvoiceDocumentReady(base, client({ document: false })), { status: 'blocked', reason: 'scope_mismatch' })
assert.deepEqual(await persistInvoiceDocumentReady(base, client({ decision: null })), { status: 'blocked', reason: 'decision_required' })

console.log('invoice-document-ready-persistence.test: PASS (P-12C-02)')
