import assert from 'node:assert'
import { existsSync, readFileSync } from 'node:fs'

const schema = readFileSync('prisma/schema.prisma', 'utf8')
const migrationPath = 'prisma/migrations/20260904013000_add_invoice_record/migration.sql'
const migration = readFileSync(migrationPath, 'utf8')

assert(existsSync(migrationPath), 'M-01 migration must be present')
assert(schema.includes('model InvoiceRecord {'), 'invoice record model must exist')
assert(schema.includes('paymentOrderId        String    @unique'), 'invoice record must require one payment order')
assert(schema.includes('providerInvoiceId     String?'), 'provider invoice id must remain nullable')
assert(schema.includes('invoiceNumber         String?'), 'invoice number must be nullable before issuance')
assert(schema.includes('invoiceUuid           String?'), 'invoice UUID must be nullable before issuance')
assert(schema.includes('state                 String    @default("not_started")'), 'invoice record must have an explicit initial state')
assert(schema.includes('@@unique([workspaceId, provider, providerInvoiceId])'), 'provider id uniqueness must be workspace/provider scoped')
assert(schema.includes('paymentOrder PaymentOrder @relation(fields: [paymentOrderId], references: [id], onDelete: Cascade)'), 'invoice record must belong to a payment order')

assert(migration.includes('CREATE TABLE "InvoiceRecord"'), 'migration must create invoice records')
assert(migration.includes('InvoiceRecord_paymentOrderId_fkey'), 'invoice record must have a payment order foreign key')
assert(migration.includes('InvoiceRecord_paymentOrderId_key'), 'payment order relation must be unique')
assert(migration.includes('InvoiceRecord_workspaceId_provider_providerInvoiceId_key'), 'provider id uniqueness must be persisted')
assert(migration.includes('InvoiceRecord_workspaceId_state_createdAt_idx'), 'workspace state index must be persisted')

console.log('invoice-record-schema.test: PASS (INV/F M-01)')
