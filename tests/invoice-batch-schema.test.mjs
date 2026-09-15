import assert from 'node:assert'
import { existsSync, readFileSync } from 'node:fs'

const schema = readFileSync('prisma/schema.prisma', 'utf8')
const migrationPath = 'prisma/migrations/20260904023000_add_invoice_batch/migration.sql'
const migration = readFileSync(migrationPath, 'utf8')

assert(existsSync(migrationPath), 'M-03 migration must be present')
assert(schema.includes('model InvoiceBatch {'), 'invoice batch model must exist')
assert(schema.includes('selectionFilterJson  String'), 'batch must persist the selection filter')
assert(schema.includes('selectionSnapshotHash String'), 'batch must persist a reproducibility hash')
assert(schema.includes('formatVersion        String'), 'batch format version must be explicit')
assert(schema.includes('model InvoiceBatchRow {'), 'invoice batch row model must exist')
assert(schema.includes('paymentOrderIdSnapshot String'), 'rows must snapshot selected payment order IDs')
assert(schema.includes('resultStatus          String   @default("pending")'), 'row result must be explicit')
assert(schema.includes('@@unique([batchId, rowNumber])'), 'row order must be unique inside a batch')
assert(!schema.includes('rawSpreadsheet'), 'raw spreadsheet content must not enter the batch model')

assert(migration.includes('CREATE TABLE "InvoiceBatch"'), 'migration must create invoice batches')
assert(migration.includes('CREATE TABLE "InvoiceBatchRow"'), 'migration must create batch rows')
assert(migration.includes('InvoiceBatch_workspaceId_fkey'), 'batch must be workspace scoped')
assert(migration.includes('InvoiceBatchRow_batchId_fkey'), 'rows must belong to a batch')
assert(migration.includes('InvoiceBatchRow_batchId_rowNumber_key'), 'row ordering uniqueness must be persisted')
assert(migration.includes('InvoiceBatchRow_paymentOrderIdSnapshot_idx'), 'payment order snapshot lookup must be indexed')

console.log('invoice-batch-schema.test: PASS (INV/F M-03)')
