import assert from 'node:assert'
import { existsSync, readFileSync } from 'node:fs'

const schema = readFileSync('prisma/schema.prisma', 'utf8')
const migrationPath = 'prisma/migrations/20260904030000_add_invoice_document_delivery/migration.sql'
const migration = readFileSync(migrationPath, 'utf8')

assert(existsSync(migrationPath), 'M-04 migration must be present')
assert(schema.includes('model InvoiceDocument {'), 'invoice document model must exist')
assert(schema.includes('storageKey     String    @unique'), 'document storage key must be unique')
assert(schema.includes('sha256         String'), 'document content hash must be stored')
assert(schema.includes('scanStatus     String    @default("pending")'), 'document scan must start pending')
assert(schema.includes('visibility     String    @default("private")'), 'document must start private')
assert(schema.includes('state          String    @default("quarantined")'), 'document must start quarantined')
assert(schema.includes('@@unique([invoiceRecordId, artifactKind, sha256])'), 'same artifact must be deduplicated per invoice')
assert(schema.includes('model InvoiceDeliveryIntent {'), 'delivery intent model must exist')
assert(schema.includes('idempotencyKey    String'), 'delivery intent must have an idempotency key')
assert(schema.includes('outboxEventId     String?   @unique'), 'delivery intent may link one outbox event')
assert(schema.includes('@@unique([invoiceRecordId, channel, idempotencyKey])'), 'delivery must be idempotent per invoice/channel')
assert(!schema.includes('publicUrl         String'), 'invoice documents must not define a public URL')

assert(migration.includes('CREATE TABLE "InvoiceDocument"'), 'migration must create invoice documents')
assert(migration.includes('CREATE TABLE "InvoiceDeliveryIntent"'), 'migration must create delivery intents')
assert(migration.includes('InvoiceDocument_storageKey_key'), 'storage key uniqueness must be persisted')
assert(migration.includes('InvoiceDocument_invoiceRecordId_artifactKind_sha256_key'), 'artifact deduplication must be persisted')
assert(migration.includes('InvoiceDeliveryIntent_invoiceRecordId_channel_idempotencyKey_key'), 'delivery idempotency must be persisted')
assert(migration.includes('InvoiceDeliveryIntent_outboxEventId_fkey'), 'delivery must support the outbox relation')

console.log('invoice-document-schema.test: PASS (INV/F M-04)')
