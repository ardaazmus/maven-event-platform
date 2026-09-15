import assert from 'node:assert/strict'
import { saveInvoiceDocumentDecision } from '../src/lib/invoice-document-decision-store.ts'

const base = {
  workspaceId: 'workspace-1',
  invoiceDocumentId: 'document-1',
  invoiceRecordId: 'invoice-1',
  matchStatus: 'matched',
  matchStrategy: 'payment_reference',
  matchedInvoiceRecordId: 'invoice-1',
  approvalStatus: 'approved',
  approvedById: 'admin-1',
}

function client({ document = true, existing = null } = {}) {
  const calls = []
  return {
    calls,
    async $transaction(work) {
      return work({
        invoiceDocument: {
          async findFirst(query) { calls.push(['document.findFirst', query]); return document ? { id: 'document-1' } : null },
        },
        invoiceDocumentDecision: {
          async findFirst(query) { calls.push(['decision.findFirst', query]); return existing },
          async create(query) { calls.push(['decision.create', query]); return { id: 'decision-1' } },
        },
      })
    },
  }
}

const createdClient = client()
assert.deepEqual(await saveInvoiceDocumentDecision(base, createdClient), { status: 'created', decisionId: 'decision-1' })
const createData = createdClient.calls.find(([name]) => name === 'decision.create')[1].data
assert.deepEqual(createData, base)

const existing = { id: 'decision-1', invoiceRecordId: 'invoice-1', matchStatus: 'matched', matchStrategy: 'payment_reference', matchedInvoiceRecordId: 'invoice-1', approvalStatus: 'approved', approvedById: 'admin-1' }
assert.deepEqual(await saveInvoiceDocumentDecision(base, client({ existing })), { status: 'duplicate', decisionId: 'decision-1' })
assert.deepEqual(await saveInvoiceDocumentDecision({ ...base, approvalStatus: 'rejected' }, client({ existing })), { status: 'blocked', reason: 'decision_conflict' })
assert.deepEqual(await saveInvoiceDocumentDecision({ ...base, matchedInvoiceRecordId: 'other-invoice' }, client()), { status: 'blocked', reason: 'input_invalid' })
assert.deepEqual(await saveInvoiceDocumentDecision({ ...base, approvedById: null }, client()), { status: 'blocked', reason: 'input_invalid' })
assert.deepEqual(await saveInvoiceDocumentDecision(base, client({ document: false })), { status: 'blocked', reason: 'scope_mismatch' })

function racedClient(existing) {
  let attempt = 0
  const calls = []
  return {
    calls,
    async $transaction(work) {
      attempt += 1
      return work({
        invoiceDocument: { async findFirst(query) { calls.push(['document.findFirst', query]); return { id: 'document-1' } } },
        invoiceDocumentDecision: {
          async findFirst(query) { calls.push(['decision.findFirst', query]); return attempt === 1 ? null : existing },
          async create(query) { calls.push(['decision.create', query]); const error = new Error('unique'); error.code = 'P2002'; throw error },
        },
      })
    },
  }
}

assert.deepEqual(await saveInvoiceDocumentDecision(base, racedClient(existing)), { status: 'duplicate', decisionId: 'decision-1' })
assert.deepEqual(await saveInvoiceDocumentDecision({ ...base, approvalStatus: 'rejected' }, racedClient(existing)), { status: 'blocked', reason: 'decision_conflict' })

console.log('invoice-document-decision-store.test: PASS (P-12C-07)')
