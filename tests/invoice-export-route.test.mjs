import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const route = readFileSync('src/app/api/invoices/export/route.ts', 'utf8')
assert(route.includes('export async function POST'), 'invoice export must be POST-only')
assert(route.includes('can.readInvoices'), 'invoice export must use invoice capability')
assert(route.includes('workspaceId: ctx.workspace.id'), 'invoice export must be tenant scoped')
assert(route.includes("status: 'succeeded'") || route.includes("status: \"succeeded\""), 'invoice export must require succeeded payment')
assert(route.includes('InvoiceBatch') || route.includes('invoiceBatch'), 'invoice export must persist a batch')
assert(route.includes('selectionSnapshotHash'), 'invoice export must persist a batch hash')
assert(route.includes('auditLog'), 'invoice export must create an audit record')
assert(route.includes('X-MavenForms-Sensitive-Data-Warning'), 'invoice export must warn about sensitive data')
assert(route.includes('Cache-Control') && route.includes('no-store'), 'invoice export must not be cached')
assert(route.includes('Content-Disposition') && route.includes('attachment'), 'invoice export must download an attachment')
assert(route.includes('createInvoiceInterchangeXlsx') && route.includes('mapInvoiceInterchangeRow'), 'invoice export must use the canonical mapper')
assert(route.includes('buildInvoiceXlsxMetadata'), 'invoice export must use opaque metadata references')
assert(!route.includes('GET'), 'invoice export must not expose a public GET surface')

console.log('invoice-export-route.test: PASS (INV/F-X-05-01)')
