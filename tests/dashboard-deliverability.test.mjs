import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const route = readFileSync('src/app/api/dashboard/route.ts', 'utf8')
const view = readFileSync('src/components/mavenforms/views/dashboard-view.tsx', 'utf8')
const types = readFileSync('src/lib/types.ts', 'utf8')

assert(route.includes('db.outboxEvent.findMany'), 'dashboard must read durable email outbox states')
assert(route.includes('db.emailProviderEvent.findMany'), 'dashboard must read processed provider events')
assert(route.includes('buildEmailDeliverabilityMetrics'), 'dashboard must use the deliverability aggregation contract')
assert(route.includes('emailProtection'), 'dashboard must read workspace email protection state')
assert(!route.includes('const failedNotifications = 2'), 'dashboard must not expose the old notification mock')
assert(!route.includes('Stripe API anahtarı yakında sona erecek'), 'dashboard must not expose fabricated system alerts')
assert(types.includes('deliverability:'), 'dashboard response type must expose deliverability metrics')
assert(view.includes('data.deliverability.accepted'), 'dashboard must display accepted count separately')
assert(view.includes('data.deliverability.delivered'), 'dashboard must display delivered count separately')

console.log('dashboard-deliverability.test: PASS (MAIL-15)')
