import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { invoiceDocumentStoragePath } from '../src/lib/invoice-document-storage.ts'

const route = readFileSync('src/app/api/invoices/[id]/documents/route.ts', 'utf8')
const storage = readFileSync('src/lib/invoice-document-storage.ts', 'utf8')

assert(route.includes('export async function POST'), 'document upload must be POST-only')
assert(route.includes('getSessionFromCookie'), 'document upload must require a session')
assert(route.includes('can.writeInvoices'), 'document upload must require invoice write capability')
assert(route.includes('workspaceId: ctx.workspace.id'), 'document upload must be tenant scoped')
assert(route.includes('paymentOrder') && route.includes('formId'), 'document upload must verify invoice payment/form scope')
assert(route.includes('validateInvoiceDocumentUpload'), 'PDF/XML upload must use the document file-type gate')
assert(route.includes('validateInvoiceArchiveUpload'), 'XLSX upload must use the archive security gate')
assert(route.includes('invoiceDocumentStoragePath'), 'document storage path must be server-owned')
assert(route.includes("scanStatus: 'pending'") || route.includes('scanStatus: "pending"'), 'uploaded documents must remain pending scan')
assert(route.includes("visibility: 'private'") || route.includes('visibility: "private"'), 'uploaded documents must remain private')
assert(route.includes("state: 'quarantined'") || route.includes('state: "quarantined"'), 'uploaded documents must remain quarantined')
assert(route.includes('auditLog'), 'document upload must be auditable')
assert(route.includes('Cache-Control') && route.includes('no-store'), 'document upload response must not be cached')
// Public GET yasaktir; kimlikli + scope kilitli hazirlik listesi GET'i readiness sozlesmesindendir
const getBlock = route.includes('export async function GET') ? route.slice(route.indexOf('export async function GET'), route.indexOf('export async function POST')) : ''
if (getBlock) {
  assert(getBlock.includes('getSessionFromCookie'), 'listeleme GET session istemeli (public degil)')
  assert(getBlock.includes('can.readInvoices'), 'listeleme GET read gate tasimali')
  assert(getBlock.includes('ctx.workspace.id'), 'listeleme GET tenant scope tasimali')
  assert(!getBlock.includes('storageKey'), 'listeleme GET storageKey sizdirmamali')
}
assert(!route.includes('publicUrl') && !route.includes('storageKey: storageKey'), 'response must not expose public URL or storage key')

assert(storage.includes('INVOICE_DOCUMENT_ROOT'), 'document storage must have a private root')
assert(storage.includes('safeIdentifier'), 'document storage identifiers must be constrained')
assert(storage.includes('invoices'), 'document storage must be invoice scoped')
assert(storage.includes('quarantine'), 'document storage must be quarantine scoped')
assert(storage.includes('path.resolve') === false, 'path resolution belongs to the route boundary')

assert.equal(
  invoiceDocumentStoragePath('workspace_1', 'invoice_1', 'document_1', 'pdf'),
  'storage/invoice-documents/workspaces/workspace_1/invoices/invoice_1/quarantine/document_1.pdf',
)
assert.throws(() => invoiceDocumentStoragePath('../outside', 'invoice_1', 'document_1', 'pdf'), /invalid_invoice_document_identifier/)
assert.throws(() => invoiceDocumentStoragePath('workspace_1', 'invoice_1', 'document_1', 'exe'), /invalid_invoice_document_identifier/)

console.log('invoice-document-upload-route.test: PASS (INV/F-U-02-01)')
