import assert from 'node:assert/strict'
import {
  buildParasutFormalizationRequest,
  parseParasutTrackableJobId,
} from '../src/lib/providers/parasut-formalization.ts'
import {
  buildParasutTrackableJobRequest,
  parseParasutTrackableJob,
} from '../src/lib/providers/parasut-v4-jobs.ts'
import {
  buildParasutActiveDocumentRequest,
  parseParasutActiveDocument,
  parseParasutPdfDescriptor,
} from '../src/lib/providers/parasut-invoice-pdf.ts'
import { buildInvoiceDocumentReadyTransition } from '../src/lib/invoice-document-ready-transition.ts'

const eInvoice = {
  companyId: '12345',
  salesInvoiceId: '3001',
  documentType: 'e_invoice',
  eInvoiceScenario: 'commercial',
  eInvoiceAddress: 'urn:mail:fixture@example.test',
}
const eInvoiceRequest = buildParasutFormalizationRequest(eInvoice, 'token-fixture')
assert.deepEqual({ url: eInvoiceRequest.url, method: eInvoiceRequest.method }, { url: 'https://api.parasut.com/v4/12345/e_invoices', method: 'POST' })
assert.equal(eInvoiceRequest.body.includes('token-fixture'), false)
assert.throws(() => buildParasutFormalizationRequest({ ...eInvoice, eInvoiceScenario: undefined }, 'token-fixture'), /scenario is required/)

const eArchiveRequest = buildParasutFormalizationRequest({
  companyId: '12345',
  salesInvoiceId: '3001',
  documentType: 'e_archive',
  internetSale: { url: 'https://example.test/orders/3001', paymentType: 'ODEMEARACISI', paymentPlatform: 'iyzico', paymentDate: '2026-09-07' },
}, 'token-fixture')
assert.equal(JSON.parse(eArchiveRequest.body).data.type, 'e_archives')
assert.throws(() => buildParasutFormalizationRequest({
  companyId: '12345', salesInvoiceId: '3001', documentType: 'e_archive', internetSale: { url: 'http://example.test/order', paymentType: 'EFT/HAVALE' },
}, 'token-fixture'), /url is invalid/)

assert.equal(parseParasutTrackableJobId({ data: { type: 'trackable_jobs', id: '7001' } }), '7001')
assert.equal(parseParasutTrackableJobId({ data: { type: 'e_invoices', id: '7001' } }), null)
assert.deepEqual(parseParasutTrackableJob({ data: { type: 'trackable_jobs', id: '7001', attributes: { status: 'pending' } } }), { providerJobId: '7001', status: 'running', providerStatus: 'pending' })
assert.equal(parseParasutTrackableJob({ data: { type: 'trackable_jobs', id: '7001', attributes: { status: 'unknown' } } }), null)
assert.deepEqual(buildParasutTrackableJobRequest('12345', '7001', 'token-fixture'), { url: 'https://api.parasut.com/v4/12345/trackable_jobs/7001', method: 'GET', headers: { accept: 'application/vnd.api+json', authorization: 'Bearer token-fixture' } })

assert.deepEqual(buildParasutActiveDocumentRequest('12345', '3001', 'token-fixture').url, 'https://api.parasut.com/v4/12345/sales_invoices/3001?include=active_e_document')
assert.deepEqual(
  parseParasutActiveDocument({ data: { relationships: { active_e_document: { data: { type: 'e_archives', id: '9001' } } } } }),
  { providerDocumentId: '9001', documentType: 'e_archives' },
)
assert.equal(parseParasutActiveDocument({ data: { relationships: { active_e_document: { data: { type: 'sales_invoices', id: '9001' } } } } }), null)
assert.deepEqual(
  parseParasutPdfDescriptor({ data: { type: 'e_document_pdfs', id: '9101', attributes: { url: 'https://files.example.test/9101.pdf', expires_at: '2026-09-07T13:00:00.000Z' } } }),
  { providerDocumentId: '9101', documentType: 'e_invoices', url: 'https://files.example.test/9101.pdf', expiresAt: new Date('2026-09-07T13:00:00.000Z') },
)
assert.equal(parseParasutPdfDescriptor({ data: { type: 'e_document_pdfs', id: '9101', attributes: { url: 'http://files.example.test/9101.pdf', expires_at: '2026-09-07T13:00:00.000Z' } } }), null)

const readyInput = {
  match: { status: 'matched', strategy: 'payment_reference', candidateId: 'invoice-fixture', requiresManualApproval: true },
  approvalStatus: 'approved',
  invoiceRecordId: 'invoice-fixture',
  matchedInvoiceRecordId: 'invoice-fixture',
  invoiceState: 'issued',
  scanStatus: 'clean',
  documentState: 'quarantined',
}
assert.deepEqual(buildInvoiceDocumentReadyTransition(readyInput), { status: 'ready', invoiceState: 'document_ready', documentState: 'quarantined', readyAtRequired: true })
assert.deepEqual(buildInvoiceDocumentReadyTransition({ ...readyInput, approvalStatus: 'pending' }), { status: 'blocked', reason: 'approval_required' })
assert.deepEqual(buildInvoiceDocumentReadyTransition({ ...readyInput, scanStatus: 'pending' }), { status: 'blocked', reason: 'scan_required' })
assert.deepEqual(buildInvoiceDocumentReadyTransition({ ...readyInput, invoiceState: 'draft' }), { status: 'blocked', reason: 'invoice_not_issued' })

console.log('v3-parasut-document-ready.test: PASS (formalization/document-ready gates only)')
