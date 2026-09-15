import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { evaluateInvoiceDocumentUploadGate } from '../src/lib/invoice-document-upload-gate.ts'
import { validateInvoiceDocumentUpload } from '../src/lib/invoice-document-validation.ts'
import { invoiceDocumentStoragePath } from '../src/lib/invoice-document-storage.ts'
import { matchInvoiceDocumentMetadata, evaluateInvoiceDocumentReady } from '../src/lib/invoice-document-matching.ts'

const source = relativePath => readFileSync(relativePath, 'utf8')
const uploadRoute = source('src/app/api/invoices/[id]/documents/route.ts')
const decisionRoute = source('src/app/api/invoices/[id]/documents/[documentId]/decision/route.ts')
const readyRoute = source('src/app/api/invoices/[id]/documents/[documentId]/ready/route.ts')

assert(uploadRoute.includes('export async function POST'), 'invoice upload must be POST-only')
assert(uploadRoute.includes('getSessionFromCookie') && uploadRoute.includes('can.writeInvoices'), 'invoice upload must require an authenticated invoice writer')
assert(uploadRoute.includes('workspaceId: ctx.workspace.id'), 'invoice upload must bind the invoice to the session workspace')
assert(uploadRoute.includes('formData()'), 'invoice upload must accept multipart data')
assert(uploadRoute.includes('validateInvoiceDocumentUpload') && uploadRoute.includes('validateInvoiceArchiveUpload'), 'invoice upload must validate document bytes before storage')
assert(uploadRoute.includes('invoiceDocumentStoragePath'), 'invoice upload must use a server-owned storage key')
assert(uploadRoute.includes("visibility: 'private'") && uploadRoute.includes("state: 'quarantined'"), 'invoice upload must remain private and quarantined')
assert(uploadRoute.includes('auditLog'), 'invoice upload must be auditable')
assert(!uploadRoute.includes('invoiceDeliveryIntent.create'), 'invoice upload must not trigger delivery')

assert(decisionRoute.includes('getSessionFromCookie') && decisionRoute.includes('can.writeInvoices'), 'invoice approval must require an authenticated invoice writer')
assert(decisionRoute.includes('approvedById: ctx.user.id'), 'approval actor must come from the server session')
assert(!decisionRoute.includes('body.workspaceId') && !decisionRoute.includes('body.approvedById'), 'approval scope and actor must not come from browser input')

assert(readyRoute.includes('getSessionFromCookie') && readyRoute.includes('can.writeInvoices'), 'document-ready must require an authenticated invoice writer')
assert(readyRoute.includes('executeInvoiceDocumentReadyFlow'), 'document-ready must use the server-side transition flow')
assert(!readyRoute.includes('body.workspaceId') && !readyRoute.includes('body.approvedById'), 'document-ready scope and actor must not come from browser input')

const validPdf = new TextEncoder().encode('%PDF-1.7\n')
assert.equal(validateInvoiceDocumentUpload({ filename: 'invoice.pdf', mime: 'application/pdf', size: validPdf.byteLength, bytes: validPdf }).ok, true)
assert.throws(() => invoiceDocumentStoragePath('../workspace', 'invoice-1', 'document-1', 'pdf'), /invalid_invoice_document_identifier/)
assert.match(invoiceDocumentStoragePath('workspace-1', 'invoice-1', 'document-1', 'pdf'), /workspaces\/workspace-1\/invoices\/invoice-1\/quarantine\/document-1\.pdf$/)

const candidates = [{ id: 'invoice-1', workspaceId: 'workspace-1', formId: 'form-1', paymentReference: 'payment-1' }]
const match = matchInvoiceDocumentMetadata({ workspaceId: 'workspace-1', formId: 'form-1', paymentReference: 'payment-1' }, candidates)
assert.deepEqual(match, { status: 'matched', strategy: 'payment_reference', candidateId: 'invoice-1', requiresManualApproval: true })
const piiOnlyMatch = matchInvoiceDocumentMetadata({ workspaceId: 'workspace-1', formId: 'form-1', legalName: 'Private Person', email: 'private@example.com', amountMinor: 1000 }, candidates)
assert.deepEqual(piiOnlyMatch, { status: 'unmatched', reason: 'no_stable_reference', requiresManualApproval: true })
assert(!JSON.stringify(piiOnlyMatch).includes('private@example.com'), 'PII-only matching must not echo recipient data')
assert.deepEqual(evaluateInvoiceDocumentReady({ match, approvalStatus: 'pending', invoiceState: 'issued', scanStatus: 'clean', documentState: 'quarantined' }), { allowed: false, reason: 'approval_required' })
assert.deepEqual(evaluateInvoiceDocumentReady({ match, approvalStatus: 'approved', invoiceState: 'issued', scanStatus: 'clean', documentState: 'quarantined' }), { allowed: true })

const phases = { 'U-00': 'pass', 'U-01': 'pass', 'U-02': 'pass', 'U-03': 'pass', 'U-04': 'pass' }
assert.deepEqual(evaluateInvoiceDocumentUploadGate({ phaseStatuses: phases, documentReadyAllowed: false }), { enabled: false, canDownload: false, canDeliver: false, reason: 'document_not_ready' })
assert.deepEqual(evaluateInvoiceDocumentUploadGate({ phaseStatuses: phases, documentReadyAllowed: true }), { enabled: true, canDownload: true, canDeliver: true })

console.log('v2-manual-invoice-flow.test: PASS (V2-07)')
