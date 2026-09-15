import assert from 'node:assert'
import { existsSync, readFileSync } from 'node:fs'

const schema = readFileSync('prisma/schema.prisma', 'utf8')
const migrationPath = 'prisma/migrations/20260904003000_add_payment_attempt_retrieve_lease/migration.sql'
assert(existsSync(migrationPath), 'retrieve lease migration must be present')
const migration = readFileSync(migrationPath, 'utf8')

assert(/retrieveAttemptCount\s+Int/.test(schema), 'retrieve attempts must be persisted')
assert(/retrieveLockedUntil\s+DateTime\?/.test(schema), 'retrieve lease expiry must be persisted')
assert(/retrieveLockedBy\s+String\?/.test(schema), 'retrieve worker identity must be persisted')
assert(schema.includes('@@index([status, retrieveLockedUntil])'), 'retrieve claim lookup must be indexed')
assert(migration.includes('ALTER TABLE "PaymentAttempt" ADD COLUMN "retrieveAttemptCount" INTEGER NOT NULL DEFAULT 0'), 'migration must add retrieve attempt count')
assert(migration.includes('ALTER TABLE "PaymentAttempt" ADD COLUMN "retrieveLockedUntil" DATETIME'), 'migration must add retrieve lease expiry')
assert(migration.includes('ALTER TABLE "PaymentAttempt" ADD COLUMN "retrieveLockedBy" TEXT'), 'migration must add retrieve worker identity')
assert(migration.includes('PaymentAttempt_status_retrieveLockedUntil_idx'), 'migration must index claim lookup')

console.log('payment-retrieve-lease-schema.test: PASS (PAY-06D-27)')
