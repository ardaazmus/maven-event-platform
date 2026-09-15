import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const route = readFileSync('src/app/api/invoices/[id]/documents/[documentId]/ready/route.ts', 'utf8')
assert(route.includes('export async function POST'), 'ready route must be POST-only')
assert(route.includes('getSessionFromCookie') && route.includes('can.writeInvoices'), 'ready route must authenticate and authorize')
assert(route.includes('executeInvoiceDocumentReadyFlow'), 'ready route must use the server caller')
assert(route.includes('process.env.MAVENFORMS_APP_ORIGIN'), 'document URL origin must be server configured')
assert(!route.includes('body.workspaceId') && !route.includes('body.approvedById'), 'workspace and actor must not come from browser body')
assert(!route.includes('body.recipientEmail') && !route.includes('body.formTitle') && !route.includes('body.invoiceNumber') && !route.includes('body.submissionId'), 'recipient and invoice metadata must come from durable server records')
assert(!route.includes('body.documentUrl'), 'document URL must be generated server-side')
assert(route.includes('Cache-Control'), 'ready response must be private and non-cacheable')

console.log('invoice-document-ready-route.test: PASS (P-12C-05)')
