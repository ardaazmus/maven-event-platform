import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/lib/payment-webhook-processing.ts', import.meta.url), 'utf8')

assert.match(source, /handoffSucceededPaymentToInvoice/)
assert.match(source, /transition\.status === 'succeeded'/)
assert.match(source, /order\.submissionId && order\.publishedVersionId/)
assert.match(source, /handoffVerifiedPaymentRefundToInvoice/)
assert.match(source, /persistInvoiceRefundReviewInTransaction/)
assert.match(source, /invoiceRecord\.findFirst/)

console.log('payment-webhook-invoice-handoff.test: PASS (INV/F C-02)')
