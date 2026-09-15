import assert from 'node:assert/strict'
import {
  buildParasutActiveDocumentRequest,
  buildParasutPdfRequest,
  createParasutInvoicePdfStoreFromClient,
  executeParasutInvoicePdfDownload,
  parseParasutActiveDocument,
  parseParasutPdfDescriptor,
} from '../src/lib/providers/parasut-invoice-pdf.ts'

const activeResponse = { data: { relationships: { active_e_document: { data: { type: 'e_archives', id: '9001' } } } } }
const active = parseParasutActiveDocument(activeResponse)
assert.deepEqual(active, { providerDocumentId: '9001', documentType: 'e_archives' })
assert.equal(parseParasutActiveDocument({ data: { relationships: { active_e_document: { data: { type: 'e_invoices', id: 'bad' } } } } }), null)
assert.equal(buildParasutActiveDocumentRequest('12345', '3001', 'secret').url, 'https://api.parasut.com/v4/12345/sales_invoices/3001?include=active_e_document')
assert.equal(buildParasutPdfRequest('12345', active, 'secret').url, 'https://api.parasut.com/v4/12345/e_archives/9001/pdf')

const pdfBytes = new TextEncoder().encode('%PDF-1.7\nprovider pdf')
const descriptor = { data: { type: 'e_document_pdfs', id: '9001', attributes: { url: 'https://provider.example/pdf/9001', expires_at: '2026-09-05T13:00:00.000Z' } } }
assert.equal(parseParasutPdfDescriptor(descriptor)?.providerDocumentId, '9001')
assert.equal(parseParasutPdfDescriptor({ data: { ...descriptor.data, attributes: { ...descriptor.data.attributes, url: 'http://provider.example/pdf' } } }), null)

function createStore() {
  const value = { saved: 0 }
  return { value, async savePdf(input) { value.saved += 1; assert.equal(input.providerInvoiceId, '3001'); assert.equal(input.providerDocumentId, '9001'); assert.equal(input.sha256.length, 64); return { documentId: 'document-1', duplicate: value.saved > 1 } } }
}

const input = { workspaceId: 'workspace-1', invoiceRecordId: 'invoice-1', companyId: '12345', salesInvoiceId: '3001', accessToken: 'secret', now: new Date('2026-09-05T12:00:00.000Z') }
const store = createStore()
const downloaded = await executeParasutInvoicePdfDownload(input, store, {
  get: async request => request.url.includes('sales_invoices') ? { status: 200, json: activeResponse } : { status: 200, json: descriptor },
  download: async url => { assert.equal(url, 'https://provider.example/pdf/9001'); return { status: 200, contentType: 'application/pdf; charset=binary', bytes: pdfBytes } },
})
assert.equal(downloaded.status, 'document_stored')
assert.equal(downloaded.providerDocumentId, '9001')
assert.equal(store.value.saved, 1)

const notReady = await executeParasutInvoicePdfDownload(input, createStore(), { get: async request => request.url.includes('sales_invoices') ? { status: 200, json: activeResponse } : { status: 204 }, download: async () => { throw new Error('must not download') } })
assert.deepEqual(notReady, { status: 'not_ready', reason: 'pdf_not_ready' })

const invalidPdf = await executeParasutInvoicePdfDownload(input, createStore(), { get: async request => request.url.includes('sales_invoices') ? { status: 200, json: activeResponse } : { status: 200, json: descriptor }, download: async () => ({ status: 200, contentType: 'text/html', bytes: new TextEncoder().encode('<html>') }) })
assert.deepEqual(invalidPdf, { status: 'reconciliation_required', reason: 'invalid_pdf' })

const expired = await executeParasutInvoicePdfDownload(input, createStore(), { get: async request => request.url.includes('sales_invoices') ? { status: 200, json: activeResponse } : { status: 200, json: { ...descriptor, data: { ...descriptor.data, attributes: { ...descriptor.data.attributes, expires_at: '2026-09-05T11:00:00.000Z' } } } }, download: async () => { throw new Error('must not download') } })
assert.deepEqual(expired, { status: 'reconciliation_required', reason: 'expired_provider_url' })

const auth = await executeParasutInvoicePdfDownload(input, createStore(), { get: async () => ({ status: 401 }), download: async () => { throw new Error('must not download') } })
assert.deepEqual(auth, { status: 'provider_error', reason: 'authentication' })

const scopeCalls = []
const guardedStore = createParasutInvoicePdfStoreFromClient({
  invoiceRecord: { findFirst: async query => { scopeCalls.push(query); return null } },
  invoiceDocument: { findFirst: async () => { throw new Error('duplicate lookup must follow ownership') } },
  $transaction: async () => { throw new Error('transaction must not start') },
  auditLog: { create: async () => { throw new Error('audit must not start') } },
}, { workspaceId: 'workspace-1', invoiceRecordId: 'invoice-1', provider: 'parasut' })
await assert.rejects(
  guardedStore.savePdf({ invoiceRecordId: 'invoice-1', providerInvoiceId: '3001', providerDocumentId: '9001', bytes: pdfBytes, sha256: 'a'.repeat(64) }),
  /scope mismatch/,
)
assert.equal(scopeCalls.length, 1)
assert.deepEqual(scopeCalls[0].where, { id: 'invoice-1', workspaceId: 'workspace-1', provider: 'parasut', providerInvoiceId: '3001' })

console.log('PASS parasut invoice pdf tests')
