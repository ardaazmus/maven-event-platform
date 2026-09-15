import assert from 'node:assert/strict'
import fs from 'node:fs'

const route = fs.readFileSync('src/app/api/public/forms/[slug]/payment-intents/route.ts', 'utf8')
const orchestration = fs.readFileSync('src/lib/iyzico-checkout-orchestration.ts', 'utf8')
const client = fs.readFileSync('src/lib/iyzico-checkout-client.ts', 'utf8')

assert.match(route, /initializeHostedIyzicoCheckout/)
assert.match(orchestration, /credentialsEnvelope: true/)
assert.match(route, /config\.provider !== 'iyzico'/)
assert.match(route, /config\.mode !== 'test'/)
assert.match(route, /evaluateFirstPartyPaymentScope/)
assert.match(route, /buildPublicPaymentCallbackUrl/)
assert.match(route, /checkoutUrl: checkout\.redirectUrl/)
assert.doesNotMatch(route, /token:\s*checkout/)
assert.match(orchestration, /attachProviderCheckout/)
assert.match(orchestration, /status: 'requires_action'/)
assert.match(client, /trustedPaymentPageUrl/)
assert.match(client, /credentials\.credentials/)
assert.doesNotMatch(client, /return \{ ok: true, token: .*secret/i)

console.log('v2-iyzico-hpp-flow.test: PASS')
