import assert from 'node:assert'
import { correlatePublicPaymentReceipt } from '../src/lib/payment-receipt-correlation.ts'

const publicKey = 'pk_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'

assert.deepEqual(correlatePublicPaymentReceipt({ publicKey, requestedSlug: 'tech-summit-2026', storedSlug: 'tech-summit-2026' }), { ok: true })
assert.deepEqual(correlatePublicPaymentReceipt({ publicKey, requestedSlug: 'other-form', storedSlug: 'tech-summit-2026' }), { ok: false, reason: 'slug_mismatch' })
assert.deepEqual(correlatePublicPaymentReceipt({ publicKey: 'po_internal', requestedSlug: 'tech-summit-2026', storedSlug: 'tech-summit-2026' }), { ok: false, reason: 'receipt_invalid' })
assert.deepEqual(correlatePublicPaymentReceipt({ publicKey, requestedSlug: '../other', storedSlug: 'tech-summit-2026' }), { ok: false, reason: 'slug_invalid' })

console.log('payment-receipt-correlation.test: PASS (PAY-06D-24)')
