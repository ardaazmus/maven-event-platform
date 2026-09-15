import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const route = readFileSync('src/app/api/invoices/[id]/documents/[documentId]/route.ts', 'utf8')
assert(route.includes('export async function GET'), 'document retrieval must be GET')
assert(route.includes('getSessionFromCookie') && route.includes('can.readInvoices'), 'retrieval must authenticate and authorize')
assert(route.includes('workspaceId: ctx.workspace.id') && route.includes('invoiceRecordId'), 'retrieval must bind invoice and workspace')
assert(route.includes("scanStatus: 'clean'") && route.includes("readyAt: { not: null }"), 'retrieval must require clean ready documents')
assert(route.includes('path.resolve') && route.includes('INVOICE_DOCUMENT_ROOT'), 'retrieval must enforce storage root')
assert(route.includes("Cache-Control': 'private, no-store'"), 'retrieval must not cache private documents')
assert(route.includes('Content-Disposition'), 'retrieval must set safe disposition')
assert(route.includes("{ error: 'Not found' }"), 'retrieval must not disclose missing document scope')
assert(!route.includes('providerUrl') && !route.includes('accessToken'), 'retrieval must not expose provider values')

console.log('invoice-document-retrieval-route.test: PASS (P-12C-06)')
