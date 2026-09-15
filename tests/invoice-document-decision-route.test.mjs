import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const route = readFileSync('src/app/api/invoices/[id]/documents/[documentId]/decision/route.ts', 'utf8')
assert(route.includes('export async function POST'), 'decision route must be POST-only')
assert(route.includes('getSessionFromCookie') && route.includes('can.writeInvoices'), 'decision route must authenticate and authorize')
assert(route.includes('approveInvoiceDocumentDecision') && route.includes('db'), 'decision route must use server approval validation')
assert(!route.includes('body.workspaceId') && !route.includes('body.approvedById'), 'workspace and actor must not come from browser body')
assert(!route.includes('body.recipientEmail') && !route.includes('body.legalName'), 'PII must not be accepted by the decision route')
assert(route.includes('Cache-Control') && route.includes('private, no-store'), 'decision response must be private and non-cacheable')

console.log('invoice-document-decision-route.test: PASS (P-12C-09)')
