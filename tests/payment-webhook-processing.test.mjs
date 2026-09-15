import assert from 'node:assert'
import { claimPaymentWebhookEvents, normalizePaymentWebhookMetadata, processPaymentWebhookEvent, runPaymentWebhookWorkerOnce } from '../src/lib/payment-webhook-processing.ts'
import { canonicalIyzicoWebhookPaymentId, isIyzicoUnverifiedRiskStatus } from '../src/lib/payment-provider-contract.ts'

const base = {
  provider: 'stripe',
  eventType: 'payment_intent.succeeded',
  providerPaymentId: 'pi_123',
  signatureVerified: true,
  amountMinor: 50000,
  currency: 'TRY',
}

assert.deepEqual(normalizePaymentWebhookMetadata(base), {
  provider: 'stripe',
  providerPaymentId: 'pi_123',
  signatureVerified: true,
  targetStatus: 'succeeded',
  amountMinor: 50000,
  currency: 'TRY',
})
assert.equal(normalizePaymentWebhookMetadata({ ...base, eventType: 'checkout.session.completed' }), null)
assert.equal(normalizePaymentWebhookMetadata({ ...base, amountMinor: null }), null)
assert.equal(normalizePaymentWebhookMetadata({ ...base, provider: 'iyzico' }), null)
assert.deepEqual(normalizePaymentWebhookMetadata({ ...base, eventType: 'charge.refunded', providerStatus: 'REFUNDED' }), {
  provider: 'stripe',
  providerPaymentId: 'pi_123',
  signatureVerified: true,
  targetStatus: 'refunded',
  amountMinor: 50000,
  currency: 'TRY',
})
assert.deepEqual(normalizePaymentWebhookMetadata({ ...base, eventType: 'charge.refunded', providerStatus: 'PARTIALLY_REFUNDED' }), {
  provider: 'stripe',
  providerPaymentId: 'pi_123',
  signatureVerified: true,
  targetStatus: 'partially_refunded',
  amountMinor: 50000,
  currency: 'TRY',
})
assert.deepEqual(normalizePaymentWebhookMetadata({ ...base, eventType: 'charge.dispute.created', providerStatus: null }), {
  provider: 'stripe',
  providerPaymentId: 'pi_123',
  signatureVerified: true,
  targetStatus: 'disputed',
  amountMinor: 50000,
  currency: 'TRY',
})
assert.equal(normalizePaymentWebhookMetadata({ ...base, eventType: 'charge.refunded', providerStatus: null }), null)

const iyzicoSuccess = {
  provider: 'iyzico',
  eventType: 'CHECKOUT_FORM_AUTH',
  providerStatus: 'SUCCESS',
  providerPaymentId: '123456',
  signatureVerified: true,
  amountMinor: null,
  currency: null,
}
assert.deepEqual(normalizePaymentWebhookMetadata(iyzicoSuccess), {
  provider: 'iyzico',
  providerPaymentId: '123456',
  signatureVerified: true,
  targetStatus: 'succeeded',
})
assert.deepEqual(normalizePaymentWebhookMetadata({ ...iyzicoSuccess, providerStatus: 'FAILURE' }), {
  provider: 'iyzico',
  providerPaymentId: '123456',
  signatureVerified: true,
  targetStatus: 'failed',
})
assert.equal(normalizePaymentWebhookMetadata({ ...iyzicoSuccess, providerStatus: 'INIT_THREEDS' }), null)
assert.equal(normalizePaymentWebhookMetadata({ ...iyzicoSuccess, providerStatus: null }), null)
for (const eventType of ['REFUND', 'CANCEL', 'CHARGEBACK', 'unknown']) {
  assert.equal(normalizePaymentWebhookMetadata({ ...iyzicoSuccess, eventType }), null, `${eventType} must remain fail-closed`)
}
for (const providerStatus of ['REFUND', 'REFUNDED', 'CANCEL', 'CANCELED', 'CANCELLED', 'CHARGEBACK', 'DISPUTE', 'DISPUTED']) {
  assert.equal(normalizePaymentWebhookMetadata({ ...iyzicoSuccess, providerStatus }), null, `${providerStatus} must remain fail-closed even on a payment event`)
  assert.equal(isIyzicoUnverifiedRiskStatus(providerStatus), true)
}
assert.equal(isIyzicoUnverifiedRiskStatus('SUCCESS'), false)
assert.equal(isIyzicoUnverifiedRiskStatus('refunded'), true)
assert.equal(canonicalIyzicoWebhookPaymentId({ format: 'hpp', paymentId: 'iyzi-payment-1', token: 'checkout-token-1' }), 'checkout-token-1')
assert.equal(canonicalIyzicoWebhookPaymentId({ format: 'direct', paymentId: 'direct-payment-1', token: null }), 'direct-payment-1')
assert.equal(canonicalIyzicoWebhookPaymentId({ format: 'hpp', paymentId: 'iyzi-payment-1', token: null }), null)

const source = await Bun.file('src/lib/payment-webhook-processing.ts').text()
const schema = await Bun.file('prisma/schema.prisma').text()
const migration = await Bun.file('prisma/migrations/20260903235500_add_payment_webhook_provider_status/migration.sql').text()
assert(source.includes('lockedUntil'), 'processing must use an expiring lease')
assert(source.includes('claimPaymentWebhookEvents'), 'processing must expose a worker claim function')
assert(source.includes('db.$transaction'), 'payment processing must be transactional')
assert(source.includes('runPaymentWebhookWorkerOnce'), 'worker runner must process a bounded claim batch')
assert(source.includes('handoffVerifiedPaymentRefundToInvoice'), 'refund/chargeback events must use the verified invoice handoff')
assert(source.includes('persistInvoiceRefundReviewInTransaction'), 'refund/chargeback review must share the webhook transaction')
assert(/providerStatus\s+String\?/.test(schema), 'payment webhook must retain provider status for provider-neutral processing')
assert(migration.includes('ALTER TABLE "PaymentWebhookEvent" ADD COLUMN "providerStatus" TEXT'), 'provider status migration must exist')
assert.equal(typeof claimPaymentWebhookEvents, 'function')
assert.equal(typeof processPaymentWebhookEvent, 'function')
assert.equal(typeof runPaymentWebhookWorkerOnce, 'function')

console.log('payment-webhook-processing.test: PASS (PAY-06B)')
