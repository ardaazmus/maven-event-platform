import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const routes = [
  readFileSync('src/app/api/webhooks/stripe/[connectionId]/route.ts', 'utf8'),
  readFileSync('src/app/api/webhooks/iyzico/[connectionId]/route.ts', 'utf8'),
]

for (const route of routes) {
  assert.match(route, /connection\.status !== 'active'/, 'unverified connections must not accept webhook events')
  assert.match(route, /value\.length <= 255/, 'webhook identity values must be bounded')
  assert.match(route, /value === value\.trim\(\)/, 'webhook identity values must not contain surrounding whitespace')
  assert.match(route, /processingStatus: 'received'/, 'webhooks must enter the durable inbox before processing')
  assert.match(route, /duplicate: true/, 'duplicate event delivery must be acknowledged without reprocessing')
  assert.doesNotMatch(route, /rawPayload|payloadJson/, 'raw provider payload must not be persisted')
}

const processing = readFileSync('src/lib/payment-webhook-processing.ts', 'utf8')
assert.match(processing, /workspaceId: event\.workspaceId, provider: event\.provider, providerOrderId: event\.providerPaymentId/)
assert.match(processing, /evaluatePaymentTransition/)
assert.match(processing, /handoffSucceededPaymentToInvoice/)
assert.match(processing, /handoffVerifiedPaymentRefundToInvoice/)

console.log('v2-payment-webhook-correlation.test: PASS')
