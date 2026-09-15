import assert from 'node:assert/strict'
import { buildParasutSalesInvoiceCreateRequest } from '../src/lib/parasut-sales-invoice-create.ts'
import { buildParasutSalesInvoicePayload } from '../src/lib/providers/parasut-v4-mappers.ts'

const base = {
  workspaceId: 'workspace-fixture',
  paymentOrderId: 'payment-fixture',
  paymentOrderStatus: 'succeeded',
  invoiceState: 'paid_ready_for_invoicing',
  contactId: '1001',
  currency: 'TRL',
  totalMinor: 12000,
  issueDate: '2026-09-07',
  lines: [{
    lineNumber: 1,
    description: 'Fixture event registration',
    quantity: '1',
    unitPriceMinor: 10000,
    taxRateBps: 2000,
    taxAmountMinor: 2000,
    lineTotalMinor: 12000,
    currency: 'TRL',
    providerProductId: '2001',
  }],
}

const mapped = buildParasutSalesInvoicePayload(base)
assert.equal(mapped.ok, true)
assert.equal(mapped.method, 'POST')
assert.equal(mapped.url, 'https://api.parasut.com/v4/{{company_id}}/sales_invoices')
assert.equal(typeof mapped.requestFingerprint, 'string')

const request = buildParasutSalesInvoiceCreateRequest('12345', 'token-fixture', mapped)
assert.deepEqual({ url: request.url, method: request.method, contentType: request.headers['content-type'] }, {
  url: 'https://api.parasut.com/v4/12345/sales_invoices',
  method: 'POST',
  contentType: 'application/vnd.api+json',
})
assert.equal(request.body.includes('token-fixture'), false)
assert.equal(request.body.includes('{{company_id}}'), false)

assert.deepEqual(buildParasutSalesInvoicePayload({ ...base, paymentOrderStatus: 'pending' }), { ok: false, reason: 'payment_not_succeeded' })
assert.deepEqual(buildParasutSalesInvoicePayload({ ...base, invoiceState: 'accounting_review_required' }), { ok: false, reason: 'accounting_review_required' })
assert.deepEqual(buildParasutSalesInvoicePayload({ ...base, totalMinor: 11999 }), { ok: false, reason: 'amount_mismatch' })
assert.deepEqual(buildParasutSalesInvoicePayload({ ...base, currency: 'USD' }), { ok: false, reason: 'foreign_exchange_rate_required' })
assert.deepEqual(buildParasutSalesInvoicePayload({ ...base, lines: [{ ...base.lines[0], providerProductId: 'unknown' }] }), { ok: false, reason: 'invalid_product_mapping' })

console.log('v3-parasut-sales-invoice.test: PASS (payload/command preparation only)')
