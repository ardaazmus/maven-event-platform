import assert from 'node:assert'
import { createPublicPaymentKey, buildPublicPaymentStatusPath, buildPublicPaymentStatusApiPath, isPublicPaymentKey } from '../src/lib/payment-status-key.ts'

const key = createPublicPaymentKey()
assert.equal(isPublicPaymentKey(key), true)
assert.match(key, /^pk_[A-Za-z0-9_-]{32}$/)
assert.equal(buildPublicPaymentStatusPath(key), `/payment-status/${key}`)
assert.equal(buildPublicPaymentStatusApiPath(key), `/api/public/payment-status/${key}`)

assert.equal(isPublicPaymentKey('po_internal_123'), false)
assert.equal(isPublicPaymentKey('pk_short'), false)
assert.equal(buildPublicPaymentStatusPath('po_internal_123'), null)
assert.equal(buildPublicPaymentStatusApiPath('po_internal_123'), null)
assert.equal(buildPublicPaymentStatusPath('pk_123/other'), null)

console.log('payment-status-key.test: PASS (PAY-06D-17)')
