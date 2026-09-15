import assert from 'node:assert'
import { existsSync, readFileSync } from 'node:fs'

const routePath = 'src/app/api/internal/workers/email-protection/route.ts'
assert(existsSync(routePath), 'email worker route must exist')
const route = readFileSync(routePath, 'utf8')

assert(route.includes('export async function POST'), 'worker route must expose POST')
assert(route.includes('MAVENFORMS_EMAIL_WORKER_SECRET'), 'worker route must require a dedicated secret')
assert(route.includes("headers.get('x-mavenforms-worker-secret')"), 'worker route must read the internal secret header')
assert(route.includes('authorizeInternalWorkerSecret'), 'worker route must use the shared timing-safe secret helper')
assert(route.includes('runEmailProtectionWorkerOnce'), 'worker route must invoke the durable email protection worker')
assert(route.includes('50'), 'worker route must bound the requested batch size')
assert(!route.includes('process.env.MAVENFORMS_EMAIL_WORKER_SECRET)') || route.includes('timingSafeEqual'), 'worker secret must not be returned or compared with a plain equality check')
assert(!route.match(/NextResponse\.json\([^\n]*eventId/), 'worker response must not expose internal event identifiers')

console.log('email-worker-route.test: PASS (MAIL-13E)')
