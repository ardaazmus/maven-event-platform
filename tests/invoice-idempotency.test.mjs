import assert from 'node:assert/strict'
import { buildInvoiceIdempotencyKey } from '../src/lib/invoice-idempotency.ts'

const input = {
  workspaceId: 'workspace-1',
  paymentOrderId: 'payment-order-1',
  purpose: 'invoice_record',
}

const first = buildInvoiceIdempotencyKey(input)
assert.equal(first.ok, true)
assert.equal(first.key, buildInvoiceIdempotencyKey(input).key)
assert.match(first.key, /^inv_[a-f0-9]{64}$/)
assert.notEqual(first.key, buildInvoiceIdempotencyKey({ ...input, workspaceId: 'workspace-2' }).key)
assert.notEqual(first.key, buildInvoiceIdempotencyKey({ ...input, purpose: 'invoice_document' }).key)
assert.deepEqual(buildInvoiceIdempotencyKey({ ...input, paymentOrderId: '' }), {
  ok: false,
  reason: 'input_invalid',
})

console.log('PASS invoice-idempotency tests')
