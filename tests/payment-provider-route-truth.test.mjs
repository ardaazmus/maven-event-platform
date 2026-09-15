import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const route = readFileSync('src/app/api/payment-provider-connections/route.ts', 'utf8')

assert(route.includes('paymentProviderConnection.findMany'), 'provider route must read scoped payment connections')
assert(route.includes('where: { workspaceId: ctx.workspace.id }'), 'provider route must enforce workspace isolation')
assert(route.includes('encryptPaymentCredential'), 'provider credentials must be encrypted before persistence')
assert(route.includes("status: 'pending_verification'"), 'new provider connections must not become active without verification')
assert(route.includes("process.env.PAYMENT_LIVE_ENABLED !== 'true'"), 'live mode must have a separate release gate')
assert(route.includes('hasCredentials: Boolean(connection.credentialsEnvelope)'), 'responses may expose presence only, not credentials')
assert(route.includes('sanitizePaymentProviderPublicConfig'), 'public provider config must pass through an allowlist projection')
assert(!route.includes('credentialsEnvelope,\n    credentialKeyId'), 'responses must not return encrypted credential material')
assert(route.includes("providerSchema = z.enum(['stripe', 'iyzico'])"), 'only approved payment providers may be connected')
assert(!route.match(/\b(cardNumber|cvv|cvc|pan)\b/i), 'provider route must not accept card data fields')

console.log('payment-provider-route-truth.test: PASS (PAY-04B)')
