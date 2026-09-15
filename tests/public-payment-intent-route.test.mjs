import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const route = readFileSync(new URL('../src/app/api/public/forms/[slug]/payment-intents/route.ts', import.meta.url), 'utf8')

assert.match(route, /export async function POST/)
assert.match(route, /publishedSnapshot\.payment/)
assert.match(route, /createOrReusePaymentOrder/)
assert.match(route, /Idempotency-Key/)
assert.match(route, /evaluatePaymentConnectionGate/)
assert.match(route, /buildPublicPaymentStatusApiPath/)
assert.match(route, /statusPath/)
assert.match(route, /status: persisted\.created \? 201 : 200/)
assert.doesNotMatch(route, /persisted\.order\.id/)
assert.doesNotMatch(route, /credentialsEnvelope/)

console.log('public-payment-intent-route.test: PASS (PAY-06D-02)')
