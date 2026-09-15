import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { validateInvoiceImportUpload, invoiceImportStoragePath } from '../src/lib/invoice-import-quarantine.ts'

const schema = readFileSync('prisma/schema.prisma', 'utf8')
const route = readFileSync('src/app/api/invoices/import/route.ts', 'utf8')
const migrationPath = 'prisma/migrations/20260904180000_add_invoice_import_batch/migration.sql'
const migration = readFileSync(migrationPath, 'utf8')

assert(existsSync(migrationPath), 'I-00 migration must be present')
assert(schema.includes('model InvoiceImportBatch {'), 'quarantine batch model must exist')
assert(schema.includes('storageKey       String   @unique'), 'quarantine storage key must be unique')
assert(schema.includes('sha256           String'), 'quarantine hash must be stored')
assert(schema.includes('scanStatus       String   @default("quarantined")'), 'scan must start quarantined')
assert(schema.includes('state            String   @default("quarantined")'), 'import state must start quarantined')
assert(migration.includes('CREATE TABLE "InvoiceImportBatch"'), 'migration must create quarantine batches')
assert(route.includes('export async function POST'), 'import quarantine must be POST-only')
assert(route.includes('can.writeInvoices'), 'import quarantine must require invoice write capability')
assert(route.includes('formData()'), 'import quarantine must receive multipart form data')
assert(route.includes('validateInvoiceImportUpload'), 'import quarantine must validate before storage')
assert(route.includes('sha256'), 'import quarantine must hash bytes')
assert(route.includes("scanStatus: 'quarantined'"), 'import must not claim a clean scan')
assert(route.includes("state: 'quarantined'"), 'import must remain quarantined')
assert(route.includes('auditLog'), 'import quarantine must audit the upload')
assert(!route.includes('parseInvoice') && !route.includes('readWorkbook'), 'I-00 must not parse the workbook')

const validBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x01, 0x02])
assert.deepEqual(
  validateInvoiceImportUpload({ filename: 'accounting.xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: validBytes.byteLength, bytes: validBytes }),
  { ok: true, sha256: '72ddd979de80b61ca55ce309f4c2a029c78a7ef9b6259e0a3d5e17a191a4cfdf', detectedMime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  'valid XLSX signature must be accepted and hashed',
)
assert.equal(validateInvoiceImportUpload({ filename: 'accounting.pdf', mime: 'application/pdf', size: validBytes.byteLength, bytes: validBytes }).ok, false)
assert.equal(validateInvoiceImportUpload({ filename: 'accounting.xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: 10 * 1024 * 1024 + 1, bytes: validBytes }).ok, false)
assert.match(invoiceImportStoragePath('workspace_1', 'upload_1'), /^storage\/invoice-imports\/workspaces\/workspace_1\/quarantine\/upload_1\.xlsx$/)
assert.throws(() => invoiceImportStoragePath('../workspace', 'upload_1'), /invalid_import_identifier/)

console.log('invoice-import-quarantine.test: PASS (INV/F-I-00-01)')
