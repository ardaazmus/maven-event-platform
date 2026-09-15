import assert from 'node:assert/strict'
import { executeInvoiceDocumentReadyFlow } from '../src/lib/invoice-document-ready-caller.ts'

const ctx = { user: { id: 'admin-1', role: 'admin' }, workspace: { id: 'workspace-1' } }
const input = {
  invoiceRecordId: 'invoice-1', documentId: 'document-1',
  match: { status: 'matched', strategy: 'payment_reference', candidateId: 'invoice-1', requiresManualApproval: true }, approvalStatus: 'approved',
  documentUrl: 'https://app.example.com/doc', appOrigin: 'https://app.example.com',
}

const calls = []
const result = await executeInvoiceDocumentReadyFlow(ctx, input, {
  persist: async (decision, client) => { calls.push(['persist', decision, client]); return { status: 'ready', invoiceRecordId: decision.invoiceRecordId, documentId: decision.documentId } },
  enqueue: async (delivery, client) => { calls.push(['enqueue', delivery, client]); return { status: 'queued', deliveryIntentId: 'intent-1', outboxEventId: 'outbox-1', idempotencyKey: 'key-1' } },
  persistClient: {}, readClient: {},
  contextClient: { invoiceRecord: { async findFirst() { return { invoiceNumber: 'INV-1', paymentOrder: { formId: 'form-1', submissionId: 'submission-1', form: { title: 'Invoice', workspaceId: 'workspace-1' }, recipientSnapshot: { workspaceId: 'workspace-1', submissionId: 'submission-1', emailEncrypted: 'encrypted-email' } } } } } },
  decryptPii: value => value === 'encrypted-email' ? 'buyer@example.com' : (() => { throw new Error('unexpected envelope') })(),
})
assert.equal(result.status, 'queued')
assert.equal(result.documentDecision, 'ready')
assert.deepEqual({ workspaceId: calls[0][1].workspaceId, approvedById: calls[0][1].approvedById }, { workspaceId: 'workspace-1', approvedById: 'admin-1' })
assert.deepEqual({ workspaceId: calls[1][1].workspaceId, formId: calls[1][1].formId, submissionId: calls[1][1].submissionId, recipientEmail: calls[1][1].recipientEmail, formTitle: calls[1][1].formTitle, invoiceNumber: calls[1][1].invoiceNumber, invoiceState: calls[1][1].invoiceState }, { workspaceId: 'workspace-1', formId: 'form-1', submissionId: 'submission-1', recipientEmail: 'buyer@example.com', formTitle: 'Invoice', invoiceNumber: 'INV-1', invoiceState: 'document_ready' })

const blockedCalls = []
const blocked = await executeInvoiceDocumentReadyFlow(ctx, input, {
  persist: async () => ({ status: 'ready', invoiceRecordId: 'invoice-1', documentId: 'document-1' }),
  enqueue: async () => { blockedCalls.push('enqueue'); return { status: 'queued', deliveryIntentId: 'unexpected', outboxEventId: 'unexpected', idempotencyKey: 'unexpected' } },
  persistClient: {}, readClient: {}, contextClient: { invoiceRecord: { async findFirst() { return null } } },
})
assert.deepEqual(blocked, { status: 'blocked', reason: 'scope_mismatch' })
assert.deepEqual(blockedCalls, [])

assert.deepEqual(await executeInvoiceDocumentReadyFlow({ user: { id: 'viewer-1', role: 'viewer' }, workspace: { id: 'workspace-1' } }, input, { persist: async () => { throw new Error('must not persist') } }), { status: 'blocked', reason: 'unauthorized' })
assert.deepEqual(await executeInvoiceDocumentReadyFlow(null, input), { status: 'blocked', reason: 'unauthorized' })

console.log('invoice-document-ready-caller.test: PASS (P-12C-04)')
