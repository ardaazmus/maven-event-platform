import assert from 'node:assert'
import { existsSync, readFileSync } from 'node:fs'

const routePath = 'src/app/api/public/payment-status/[publicKey]/route.ts'
assert(existsSync(routePath), 'public payment status route must exist')
const route = readFileSync(routePath, 'utf8')

assert.match(route, /export async function GET/)
assert.match(route, /isPublicPaymentKey/)
assert.match(route, /checkRateLimit/)
assert.match(route, /sanitizePublicPaymentStatus/)
assert.match(route, /Cache-Control.*no-store/)
assert.match(route, /status: 429/)
assert.doesNotMatch(route, /providerOrderId/)
assert.doesNotMatch(route, /credentialsEnvelope/)
assert.doesNotMatch(route, /order\.id/)

console.log('public-payment-status-route.test: PASS (PAY-06D-20)')
