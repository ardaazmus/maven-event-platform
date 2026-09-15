import assert from 'node:assert'
import { existsSync, readFileSync } from 'node:fs'

const routePath = 'src/app/api/webhooks/mailchimp-transactional/[connectionId]/route.ts'
assert(existsSync(routePath), 'Mailchimp webhook route must exist')
const route = readFileSync(routePath, 'utf8')

assert(route.includes('export async function POST'), 'Mailchimp webhook route must expose POST')
assert(route.includes('emailProviderConnection'), 'Mailchimp webhook route must resolve a workspace provider connection')
assert(route.includes("provider: 'mailchimp_transactional'"), 'route must be pinned to the transactional provider')
assert(route.includes("status: 'active'"), 'route must accept events only for active connections')
assert(route.includes('webhookSecretEnvelope'), 'route must read the encrypted webhook secret envelope')
assert(route.includes('decryptEmailCredential'), 'route must decrypt secrets only at the request boundary')
assert(route.includes("headers.get('x-mandrill-signature')"), 'route must read the signed Mailchimp header')
assert(route.includes('await req.text()'), 'route must read the unmodified request body')
assert(route.includes("createHash('sha256')"), 'route must persist a payload hash, not the raw payload')
assert(route.includes('normalizeMailchimpTransactionalWebhook'), 'route must use the verified provider normalizer')
assert(route.includes('buildEmailProviderEventCreateData'), 'route must use the raw-payload-free persistence mapper')
assert(route.includes('db.$transaction'), 'event inbox writes must be transactional')
assert(route.includes('emailProviderEvent.upsert'), 'provider retries must be idempotent')
assert(route.includes('workspaceId_provider_externalEventId'), 'upsert must use the tenant/provider/event uniqueness boundary')
assert(route.includes('signatureVerified: true'), 'only verified events may enter the inbox')
assert(!route.includes('rawPayload') && !route.includes('payloadJson'), 'route must not persist raw provider payloads')
assert(!route.match(/NextResponse\.json\([^\n]*(webhookSecretEnvelope|credentialsEnvelope|webhookKey)/), 'route must not expose secret material')

console.log('mailchimp-webhook-route.test: PASS (MAIL-13C)')
