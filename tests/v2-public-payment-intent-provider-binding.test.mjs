import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const route = readFileSync(new URL('../src/app/api/public/forms/[slug]/payment-intents/route.ts', import.meta.url), 'utf8')
const businessModel = readFileSync(new URL('../src/lib/payment-business-model.ts', import.meta.url), 'utf8')

assert.match(businessModel, /export function evaluatePublicFirstPartyPaymentProvider/)
assert.match(route, /evaluatePublicFirstPartyPaymentProvider/)
assert.match(businessModel, /provider: 'iyzico'/)
assert.match(businessModel, /mode_not_allowed/)
assert.doesNotMatch(route, /body\.provider/)
assert.doesNotMatch(route, /body\.merchant/)
assert.doesNotMatch(route, /body\.workspaceId/)
assert.doesNotMatch(route, /body\.mode/)
assert.doesNotMatch(route, /body\.amount/)
assert.doesNotMatch(route, /body\.currency/)
assert.doesNotMatch(route, /body\.callbackUrl/)
assert.match(businessModel, /provider_deferred/)

console.log('v2-public-payment-intent-provider-binding.test: PASS')
