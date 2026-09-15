import assert from 'node:assert'
import { sanitizePublicPaymentStatus } from '../src/lib/public-payment-status-dto.ts'

const safe = sanitizePublicPaymentStatus({
  publicKey: 'pk_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  status: 'processing',
  amountMinor: 12550,
  currency: 'TRY',
  id: 'po_internal',
  workspaceId: 'ws_secret',
  provider: 'iyzico',
  providerOrderId: 'provider_secret',
  credentialsEnvelope: 'secret',
})

assert.deepEqual(safe, { status: 'processing', amountMinor: 12550, currency: 'TRY' })
assert.equal('id' in safe, false)
assert.equal('workspaceId' in safe, false)
assert.equal('provider' in safe, false)
assert.equal('providerOrderId' in safe, false)
assert.equal('credentialsEnvelope' in safe, false)

assert.equal(sanitizePublicPaymentStatus({ publicKey: 'po_internal', status: 'succeeded', amountMinor: 100, currency: 'TRY' }), null)
assert.equal(sanitizePublicPaymentStatus({ publicKey: 'pk_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', status: 'unknown', amountMinor: 100, currency: 'TRY' }), null)
assert.equal(sanitizePublicPaymentStatus({ publicKey: 'pk_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', status: 'succeeded', amountMinor: -1, currency: 'TRY' }), null)

console.log('public-payment-status-dto.test: PASS (PAY-06D-19)')
