import assert from 'node:assert/strict'
import { buildParasutSalesInvoicePayload } from '../src/lib/providers/parasut-v4-mappers.ts'

const base = {
  workspaceId: 'ws_1',
  paymentOrderId: 'po_1',
  paymentOrderStatus: 'succeeded',
  invoiceState: 'paid_ready_for_invoicing',
  contactId: '42',
  currency: 'TRL',
  totalMinor: 12000,
  issueDate: '2026-09-05',
  lines: [{ lineNumber: 1, description: 'Etkinlik kaydı', quantity: '2', unitPriceMinor: 5000, taxRateBps: 2000, taxAmountMinor: 2000, discountAmountMinor: 0, lineTotalMinor: 12000, currency: 'TRL', providerProductId: '77' }],
}

const result = buildParasutSalesInvoicePayload(base)
assert.equal(result.ok, true)
assert.equal(result.url, 'https://api.parasut.com/v4/{{company_id}}/sales_invoices')
assert.equal(result.method, 'POST')
assert.equal(typeof result.requestFingerprint, 'string')
assert.deepEqual(result.payload.data, {
  type: 'sales_invoices',
  attributes: { item_type: 'invoice', issue_date: '2026-09-05', currency: 'TRL' },
  relationships: {
    contact: { data: { type: 'contacts', id: '42' } },
    details: { data: [{ type: 'sales_invoice_details', attributes: { quantity: 2, unit_price: 50, vat_rate: 20, description: 'Etkinlik kaydı' }, relationships: { product: { data: { type: 'products', id: '77' } } } }] },
  },
})
assert.equal(JSON.stringify(result).includes('invoice_no'), false, 'provider read-only invoice fields must not be sent')
assert.equal(JSON.stringify(result).includes('secret'), false)

assert.deepEqual(buildParasutSalesInvoicePayload({ ...base, paymentOrderStatus: 'pending' }), { ok: false, reason: 'payment_not_succeeded' })
assert.deepEqual(buildParasutSalesInvoicePayload({ ...base, invoiceState: 'accounting_review_required' }), { ok: false, reason: 'accounting_review_required' })
assert.deepEqual(buildParasutSalesInvoicePayload({ ...base, contactId: 'not-numeric' }), { ok: false, reason: 'invalid_contact' })
assert.deepEqual(buildParasutSalesInvoicePayload({ ...base, lines: [{ ...base.lines[0], providerProductId: 'bad' }] }), { ok: false, reason: 'invalid_product_mapping' })
assert.deepEqual(buildParasutSalesInvoicePayload({ ...base, totalMinor: 11999 }), { ok: false, reason: 'amount_mismatch' })
assert.deepEqual(buildParasutSalesInvoicePayload({ ...base, currency: 'USD', exchangeRate: undefined }), { ok: false, reason: 'foreign_exchange_rate_required' })
assert.deepEqual(buildParasutSalesInvoicePayload({ ...base, orderNo: 'ORD-1' }), { ok: false, reason: 'order_pair_invalid' })
assert.deepEqual(buildParasutSalesInvoicePayload({ ...base, lines: [{ ...base.lines[0], lineTotalMinor: 10000 }] }), { ok: false, reason: 'amount_mismatch' })

console.log('parasut sales invoice mapper contract tests: PASS')
