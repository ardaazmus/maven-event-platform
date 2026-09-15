import assert from 'node:assert'
import { existsSync, readFileSync } from 'node:fs'

const routePath = 'src/app/api/internal/workers/payment-retrieve/route.ts'
assert(existsSync(routePath), 'payment retrieve worker route must exist')
const route = readFileSync(routePath, 'utf8')

assert(route.includes('export async function POST'), 'payment retrieve worker route must expose POST')
assert(route.includes('MAVENFORMS_PAYMENT_WORKER_SECRET'), 'payment retrieve worker route must require a dedicated payment secret')
assert(route.includes('authorizePaymentRetrieveWorkerRequest'), 'payment retrieve worker route must use the payment worker gate')
assert(route.includes('runPaymentRetrieveBatch'), 'payment retrieve worker route must invoke the bounded retrieve batch worker')
assert(route.includes('runNextDuePaymentRetrieveFromDatabase'), 'payment retrieve worker route must resolve DB-scoped provider connections')
assert(route.includes('randomUUID'), 'payment retrieve worker route must generate a per-run worker identity')
assert(route.includes('buildPaymentRetrieveWorkerRunSummary'), 'payment retrieve worker route must return a bounded safe run summary')
assert(route.includes('startedAtMs'), 'payment retrieve worker route must capture a run start timestamp')
assert(route.includes('finishedAtMs'), 'payment retrieve worker route must capture a run finish timestamp')
assert(!route.match(/NextResponse\.json\([^\n]*(credentials|secret|providerPaymentId|paymentOrderId)/i), 'worker response must not expose secrets or payment identifiers')

console.log('payment-retrieve-worker-route.test: PASS (PAY-06D-47)')
