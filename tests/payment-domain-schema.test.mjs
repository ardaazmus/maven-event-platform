import assert from 'node:assert'
import { existsSync, readFileSync } from 'node:fs'

const schema = readFileSync('prisma/schema.prisma', 'utf8')
const migrationPath = 'prisma/migrations/20260902143000_add_payment_order_foundation/migration.sql'
const migration = readFileSync(migrationPath, 'utf8')
const publicKeyMigrationPath = 'prisma/migrations/20260904001500_add_payment_order_public_key/migration.sql'
const publicKeyMigration = readFileSync(publicKeyMigrationPath, 'utf8')

assert(existsSync(migrationPath), 'PAY-02A migration must be present')
assert(schema.includes('model PaymentOrder {'), 'payment order model must exist')
assert(schema.includes('model PaymentAttempt {'), 'payment attempt model must exist')
assert(schema.includes('amountMinor        Int'), 'payment amount must use integer minor units')
assert(schema.includes('status             String    @default("created")'), 'payment order must start in created state')
assert(schema.includes('@@unique([workspaceId, idempotencyKey])'), 'idempotency must be unique per workspace')
assert(schema.includes('publicKey          String   @unique'), 'public payment status key must be unique')

for (const forbidden of ['cardNumber', 'cvv', 'secretKey', 'rawToken']) {
  assert(!schema.includes(forbidden), `payment schema must not store ${forbidden}`)
}

assert(migration.includes('CREATE TABLE "PaymentOrder"'), 'migration must create payment orders')
assert(migration.includes('CREATE TABLE "PaymentAttempt"'), 'migration must create payment attempts')
assert(migration.includes('PaymentOrder_workspaceId_idempotencyKey_key'), 'migration must create idempotency uniqueness')
assert(migration.includes('PaymentAttempt_paymentOrderId_fkey'), 'attempts must belong to an order')
assert(existsSync(publicKeyMigrationPath), 'public payment key migration must be present')
assert(publicKeyMigration.includes('ALTER TABLE "PaymentOrder" ADD COLUMN "publicKey" TEXT'), 'public key migration must preserve existing orders')
assert(publicKeyMigration.includes('randomblob(24)'), 'existing public keys must be generated randomly')
assert(publicKeyMigration.includes('PaymentOrder_publicKey_key'), 'public payment keys must be unique')

console.log('payment-domain-schema.test: PASS (PAY-02A)')
