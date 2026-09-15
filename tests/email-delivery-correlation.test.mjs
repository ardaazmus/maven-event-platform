import assert from 'node:assert'
import { existsSync, readFileSync } from 'node:fs'

const sourcePath = 'src/lib/email-delivery-correlation.ts'
const worker = readFileSync('src/lib/email-protection-worker.ts', 'utf8')
const schema = readFileSync('prisma/schema.prisma', 'utf8')
const migrationPath = 'prisma/migrations/20260903234500_add_outbox_delivery_status/migration.sql'

assert(existsSync(sourcePath), 'delivery correlation helper must exist')
assert(schema.includes('deliveryStatus String?'), 'outbox must separate provider acceptance from delivery status')
assert(existsSync(migrationPath), 'delivery status migration must exist')
const migration = readFileSync(migrationPath, 'utf8')
assert(migration.includes('"deliveryStatus" TEXT'), 'delivery status migration must add a nullable text column')

const { nextEmailDeliveryStatus } = await import('../src/lib/email-delivery-correlation.ts')

assert.equal(nextEmailDeliveryStatus(null, 'delivered'), 'delivered')
assert.equal(nextEmailDeliveryStatus('delivered', 'bounce'), 'bounced')
assert.equal(nextEmailDeliveryStatus('bounced', 'delivered'), 'bounced')
assert.equal(nextEmailDeliveryStatus('rejected', 'complaint'), 'complained')
assert.equal(nextEmailDeliveryStatus(null, 'reject'), 'rejected')
assert.equal(nextEmailDeliveryStatus('delivered', 'unsubscribe'), null)
assert.equal(nextEmailDeliveryStatus(null, 'open'), null)
assert(worker.includes('nextEmailDeliveryStatus'), 'provider event worker must apply delivery evidence transitions')
assert(worker.includes('outboxEvent.findMany'), 'worker must search outbox by provider message identity')
assert(worker.includes('deliveryStatus'), 'worker must update the separate delivery status field')
assert(worker.includes("type: 'email'"), 'delivery correlation must only target email outbox records')
assert(worker.includes('providerMessageId'), 'delivery correlation must require provider message identity')

console.log('email-delivery-correlation.test: PASS (MAIL-13D)')
