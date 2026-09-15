import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const workerPath = 'src/lib/outbox-dispatch-worker.ts'
const routePath = 'src/app/api/internal/workers/email-dispatch/route.ts'
assert(existsSync(workerPath), 'durable email dispatch worker must exist')
assert(existsSync(routePath), 'email dispatch worker route must exist')

const worker = readFileSync(workerPath, 'utf8')
const route = readFileSync(routePath, 'utf8')
assert(worker.includes('claimOutboxEvents'), 'dispatch worker must claim leased outbox events')
assert(worker.includes("claimOutboxEvents(limit, workerId, 'email')"), 'dispatch worker must claim email events only')
assert(worker.includes('sendOutboxMailchimpEmail'), 'dispatch worker must call server-only provider adapter')
assert(worker.includes('completeOutboxEmailAccepted'), 'accepted provider response must persist correlation identity')
assert(worker.includes("'permanent'"), 'provider rejection must use permanent dead-letter semantics')
assert(route.includes('MAVENFORMS_EMAIL_WORKER_SECRET'), 'dispatch route must require a dedicated worker secret')
assert(route.includes('authorizeInternalWorkerSecret'), 'dispatch route must use the shared timing-safe secret helper')
assert(route.includes('runOutboxDispatchWorkerOnce'), 'dispatch route must invoke durable dispatch worker')

console.log('email-dispatch-worker.test: PASS (MAIL-13K)')
