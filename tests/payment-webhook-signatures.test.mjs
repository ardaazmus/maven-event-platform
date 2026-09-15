import assert from 'node:assert'
import { createHmac } from 'node:crypto'
import { verifyIyzicoV3WebhookSignature, verifyStripeWebhookSignature } from '../src/lib/payment-webhook-signatures.ts'

const stripeBody = '{"id":"evt_test_1","type":"payment_intent.succeeded"}'
const stripeSecret = 'whsec_test'
const stripeTimestamp = Math.floor(Date.now() / 1000)
const stripeDigest = createHmac('sha256', stripeSecret).update(`${stripeTimestamp}.${stripeBody}`).digest('hex')
const stripeHeader = `t=${stripeTimestamp},v1=${stripeDigest}`
const tamperedStripeDigest = `${stripeDigest.slice(0, -1)}${stripeDigest.endsWith('0') ? '1' : '0'}`

assert.equal(verifyStripeWebhookSignature(stripeBody, stripeHeader, stripeSecret), true, 'valid Stripe raw-body signature must pass')
assert.equal(verifyStripeWebhookSignature(stripeBody, `t=${stripeTimestamp},v1=${tamperedStripeDigest}`, stripeSecret), false, 'tampered Stripe signature must fail')
assert.equal(verifyStripeWebhookSignature(stripeBody, `t=${stripeTimestamp - 600},v1=${stripeDigest}`, stripeSecret), false, 'stale Stripe signature must fail')
assert.equal(verifyStripeWebhookSignature(JSON.stringify({ ...JSON.parse(stripeBody), changed: true }), stripeHeader, stripeSecret), false, 'mutated Stripe body must fail')

const direct = {
  format: 'direct',
  secretKey: 'iyzico-secret',
  eventType: 'THREE_DS_AUTH',
  paymentId: '12345',
  paymentConversationId: 'conversation-1',
  status: 'SUCCESS',
}
const directMessage = direct.secretKey + direct.eventType + direct.paymentId + direct.paymentConversationId + direct.status
const directSignature = createHmac('sha256', direct.secretKey).update(directMessage).digest('hex')
const tamperedDirectSignature = `${directSignature.slice(0, -1)}${directSignature.endsWith('0') ? '1' : '0'}`
assert.equal(verifyIyzicoV3WebhookSignature(direct, directSignature), true, 'valid iyzico direct V3 signature must pass')
assert.equal(verifyIyzicoV3WebhookSignature(direct, tamperedDirectSignature), false, 'tampered iyzico signature must fail')

const hpp = {
  format: 'hpp',
  secretKey: 'iyzico-secret',
  eventType: 'CHECKOUT_FORM_AUTH',
  iyziPaymentId: '98765',
  token: 'checkout-token',
  paymentConversationId: 'conversation-2',
  status: 'SUCCESS',
}
const hppMessage = hpp.secretKey + hpp.eventType + hpp.iyziPaymentId + hpp.token + hpp.paymentConversationId + hpp.status
const hppSignature = createHmac('sha256', hpp.secretKey).update(hppMessage).digest('hex')
assert.equal(verifyIyzicoV3WebhookSignature(hpp, hppSignature), true, 'valid iyzico HPP V3 signature must pass')

console.log('payment-webhook-signatures.test: PASS (PAY-05A)')
