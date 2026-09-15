import assert from 'node:assert/strict'
import { buildInvoiceReadyDelivery } from '../src/lib/invoice-delivery-enqueue.ts'
import { buildParasutSalesInvoicePayload } from '../src/lib/providers/parasut-v4-mappers.ts'
import { buildParasutActiveDocumentRequest, buildParasutPdfRequest, parseParasutActiveDocument, parseParasutPdfDescriptor } from '../src/lib/providers/parasut-invoice-pdf.ts'
import { buildParasutTrackableJobRequest, parseParasutTrackableJob } from '../src/lib/providers/parasut-v4-jobs.ts'

const invoice = buildParasutSalesInvoicePayload({
  workspaceId: 'workspace-1', paymentOrderId: 'payment-1', paymentOrderStatus: 'succeeded', invoiceState: 'paid_ready_for_invoicing', contactId: '42', currency: 'TRL', totalMinor: 12000, issueDate: '2026-09-06',
  lines: [{ lineNumber: 1, description: 'Etkinlik kaydı', quantity: '2', unitPriceMinor: 5000, taxRateBps: 2000, taxAmountMinor: 2000, discountAmountMinor: 0, lineTotalMinor: 12000, currency: 'TRL', providerProductId: '77' }],
})
assert.equal(invoice.ok, true)
assert.equal(invoice.method, 'POST')
assert.equal(invoice.url, 'https://api.parasut.com/v4/{{company_id}}/sales_invoices')
assert(!JSON.stringify(invoice).includes('accessToken'))
assert.deepEqual(buildParasutSalesInvoicePayload({
  workspaceId: 'workspace-1', paymentOrderId: 'payment-1', paymentOrderStatus: 'refunded', invoiceState: 'paid_ready_for_invoicing', contactId: '42', currency: 'TRL', totalMinor: 12000, issueDate: '2026-09-06', lines: invoice.ok ? [{ lineNumber: 1, description: 'Etkinlik kaydı', quantity: '2', unitPriceMinor: 5000, taxRateBps: 2000, taxAmountMinor: 2000, discountAmountMinor: 0, lineTotalMinor: 12000, currency: 'TRL', providerProductId: '77' }] : [],
}), { ok: false, reason: 'payment_not_succeeded' })

const jobRequest = buildParasutTrackableJobRequest('12345', '3001', 'temporary-server-token')
assert.equal(jobRequest.method, 'GET')
assert.equal(jobRequest.url, 'https://api.parasut.com/v4/12345/trackable_jobs/3001')
const running = parseParasutTrackableJob({ data: { type: 'trackable_jobs', id: '3001', attributes: { status: 'pending' } } })
assert.deepEqual(running, { providerJobId: '3001', status: 'running', providerStatus: 'pending' })
assert.equal(parseParasutTrackableJob({ data: { type: 'trackable_jobs', id: 'bad', attributes: { status: 'done' } } }), null)

const active = parseParasutActiveDocument({ data: { relationships: { active_e_document: { data: { type: 'e_archives', id: '9001' } } } } })
assert.deepEqual(active, { providerDocumentId: '9001', documentType: 'e_archives' })
assert.equal(buildParasutActiveDocumentRequest('12345', '3001', 'temporary-server-token').url, 'https://api.parasut.com/v4/12345/sales_invoices/3001?include=active_e_document')
assert.equal(buildParasutPdfRequest('12345', active, 'temporary-server-token').url, 'https://api.parasut.com/v4/12345/e_archives/9001/pdf')
const pdf = parseParasutPdfDescriptor({ data: { type: 'e_document_pdfs', id: '9001', attributes: { url: 'https://provider.example/pdf/9001', expires_at: '2026-09-06T12:00:00.000Z' } } })
assert.equal(pdf?.providerDocumentId, '9001')

const delivery = buildInvoiceReadyDelivery({
  workspaceId: 'workspace-1', formId: 'form-1', submissionId: 'submission-1', invoiceRecordId: 'invoice-1', documentId: 'document-1', invoiceState: 'document_ready', documentState: 'quarantined', scanStatus: 'clean', recipientEmail: 'buyer@example.com', formTitle: 'Invoice', documentUrl: 'https://app.example.com/private/invoices/invoice-1/document-1', appOrigin: 'https://app.example.com',
})
assert.deepEqual({ queueClass: delivery.queueClass, channel: delivery.channel, idempotencyKey: delivery.idempotencyKey }, { queueClass: 'transactional', channel: 'email', idempotencyKey: 'invoice:invoice-1:document:document-1:email:v1' })
assert.equal(delivery.outbox.payload.documentUrl.includes('provider.example'), false)
console.log('parasut-release-chain.test: PASS (R-06)')
