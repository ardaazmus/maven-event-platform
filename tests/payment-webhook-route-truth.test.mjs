import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const stripe = readFileSync('src/app/api/webhooks/stripe/[connectionId]/route.ts', 'utf8')
const iyzico = readFileSync('src/app/api/webhooks/iyzico/[connectionId]/route.ts', 'utf8')

for (const route of [stripe, iyzico]) {
  assert(route.includes('await req.text()'), 'webhook routes must read the unmodified request body')
  assert(route.includes('paymentWebhookEvent.create'), 'verified webhook routes must write to the inbox')
  assert(route.includes('signatureVerified: true'), 'only verified events may enter the inbox')
  assert(route.includes('payloadHash'), 'webhook routes must store a hash instead of the raw payload')
  assert(route.includes('providerPaymentId'), 'webhook routes must retain only provider payment identity for matching')
  assert(route.includes("duplicate: true"), 'duplicate deliveries must be acknowledged idempotently')
  assert(!route.includes('rawPayload') && !route.includes('payloadJson'), 'webhook routes must not persist raw payload fields')
  assert(!route.match(/NextResponse\.json\([^\n]*credentialsEnvelope/), 'webhook responses must not expose credential material')
}

assert(stripe.includes('verifyStripeWebhookSignature'), 'Stripe route must verify Stripe signatures')
assert(stripe.includes("req.headers.get('stripe-signature')"), 'Stripe route must use the Stripe-Signature header')
assert(stripe.includes("eventType === 'charge.refunded'"), 'Stripe route must classify refund charge events')
assert(stripe.includes("eventType === 'charge.dispute.created'"), 'Stripe route must classify dispute charge events')
assert(stripe.includes('const chargeRefundOrDisputeEvent ='), 'Stripe charge risk events must use an explicit correlation branch')
assert(stripe.includes('chargeRefundOrDisputeEvent ? referenceValue(providerObjectRecord?.payment_intent) : providerObjectId'), 'Stripe charge risk events must never fall back to charge ID')
assert(!stripe.includes('chargeRefundOrDisputeEvent ? providerObjectId'), 'Stripe charge risk events must not use the charge ID as a fallback')
assert(stripe.includes('payment_intent'), 'Stripe charge events must correlate to the payment intent')
assert(stripe.includes('amount_refunded'), 'Stripe refund events must retain bounded refund classification metadata')
assert(stripe.includes('PARTIALLY_REFUNDED'), 'Stripe refund events must distinguish partial refunds')
assert(iyzico.includes('verifyIyzicoV3WebhookSignature'), 'iyzico route must verify V3 signatures')
assert(iyzico.includes("req.headers.get('x-iyz-signature-v3')"), 'iyzico route must use X-IYZ-SIGNATURE-V3')
assert(iyzico.includes('providerStatus: status'), 'iyzico route must persist provider status for worker normalization')
assert(!stripe.includes("processingStatus: 'processed'") && !iyzico.includes("processingStatus: 'processed'"), 'webhook inbox phase must not fake payment processing')

console.log('payment-webhook-route-truth.test: PASS (PAY-05B)')
