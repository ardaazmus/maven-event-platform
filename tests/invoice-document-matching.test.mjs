import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { matchInvoiceDocumentMetadata, evaluateInvoiceDocumentReady } from '../src/lib/invoice-document-matching.ts'

const route = readFileSync('src/app/api/invoices/[id]/documents/[documentId]/match-preview/route.ts', 'utf8')

const candidates = [
  { id: 'invoice_1', workspaceId: 'workspace_1', formId: 'form_1', paymentReference: 'payref_1', providerInvoiceId: 'provider_1', invoiceUuid: '11111111-1111-4111-8111-111111111111', invoiceNumber: 'INV-001' },
  { id: 'invoice_2', workspaceId: 'workspace_1', formId: 'form_1', paymentReference: 'payref_2', providerInvoiceId: 'provider_2', invoiceUuid: '22222222-2222-4222-8222-222222222222', invoiceNumber: 'INV-002' },
]

assert.deepEqual(matchInvoiceDocumentMetadata({ workspaceId: 'workspace_1', formId: 'form_1', paymentReference: 'payref_1' }, candidates), {
  status: 'matched', strategy: 'payment_reference', candidateId: 'invoice_1', requiresManualApproval: true,
})
assert.deepEqual(matchInvoiceDocumentMetadata({ workspaceId: 'workspace_1', formId: 'form_1', legalName: 'Secret', email: 'secret@example.com', amountMinor: 1000 }, candidates), {
  status: 'unmatched', reason: 'no_stable_reference', requiresManualApproval: true,
})
assert.deepEqual(matchInvoiceDocumentMetadata({ workspaceId: 'workspace_1', formId: 'form_1', paymentReference: 'payref_1' }, [
  ...candidates,
  { ...candidates[1], id: 'invoice_duplicate', paymentReference: 'payref_1' },
]), {
  status: 'conflict', reason: 'ambiguous_reference', requiresManualApproval: true,
})

assert.deepEqual(evaluateInvoiceDocumentReady({ match: { status: 'matched', strategy: 'payment_reference', candidateId: 'invoice_1', requiresManualApproval: true }, approvalStatus: 'pending', invoiceState: 'issued', scanStatus: 'clean', documentState: 'quarantined' }), {
  allowed: false, reason: 'approval_required',
})
assert.deepEqual(evaluateInvoiceDocumentReady({ match: { status: 'unmatched', reason: 'no_candidate', requiresManualApproval: true }, approvalStatus: 'approved', invoiceState: 'issued', scanStatus: 'clean', documentState: 'quarantined' }), {
  allowed: false, reason: 'match_not_safe',
})
assert.deepEqual(evaluateInvoiceDocumentReady({ match: { status: 'matched', strategy: 'payment_reference', candidateId: 'invoice_1', requiresManualApproval: true }, approvalStatus: 'approved', invoiceState: 'issued', scanStatus: 'clean', documentState: 'quarantined' }), {
  allowed: true,
})

assert(route.includes('export async function POST'), 'match preview must be POST-only')
assert(route.includes('getSessionFromCookie') && route.includes('can.readInvoices'), 'match preview must be authenticated')
assert(route.includes('workspaceId: ctx.workspace.id'), 'match preview must be tenant scoped')
assert(route.includes('invoiceRecordId: invoiceId'), 'match preview must bind the document to the invoice')
assert(route.includes('matchInvoiceDocumentMetadata'), 'route must use the stable document matcher')
assert(route.includes('evaluateInvoiceDocumentReady'), 'route must expose the ready gate decision')
assert(!route.includes('.update(') && !route.includes('.create('), 'preview must not mutate document or delivery state')
assert(!route.includes('storageKey'), 'preview must not expose storage keys')

console.log('invoice-document-matching.test: PASS (INV/F-U-04-01)')
