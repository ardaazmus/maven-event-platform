import assert from 'node:assert'
import { existsSync, readFileSync } from 'node:fs'

const schema = readFileSync('prisma/schema.prisma', 'utf8')
const migrationPath = 'prisma/migrations/20260904020000_add_invoice_line_snapshot/migration.sql'
const migration = readFileSync(migrationPath, 'utf8')

assert(existsSync(migrationPath), 'M-02 migration must be present')
assert(schema.includes('model InvoiceLineSnapshot {'), 'invoice line snapshot model must exist')
assert(schema.includes('invoiceRecordId    String'), 'invoice line must belong to an invoice record')
assert(schema.includes('lineNumber         Int'), 'invoice line order must be explicit')
assert(schema.includes('quantity           String'), 'quantity must avoid floating-point storage')
assert(schema.includes('unitPriceMinor     Int'), 'unit price must use minor units')
assert(schema.includes('taxAmountMinor     Int?'), 'tax amount snapshot must be nullable')
assert(schema.includes('discountAmountMinor Int?'), 'discount snapshot must be nullable')
assert(schema.includes('lineTotalMinor     Int'), 'line total snapshot must use minor units')
assert(schema.includes('@@unique([invoiceRecordId, lineNumber])'), 'line order must be unique per invoice')

assert(migration.includes('CREATE TABLE "InvoiceLineSnapshot"'), 'migration must create invoice line snapshots')
assert(migration.includes('InvoiceLineSnapshot_invoiceRecordId_fkey'), 'line snapshots must reference invoice records')
assert(migration.includes('InvoiceLineSnapshot_invoiceRecordId_lineNumber_key'), 'line order uniqueness must be persisted')
assert(migration.includes('InvoiceLineSnapshot_invoiceRecordId_createdAt_idx'), 'invoice line lookup index must be persisted')
assert(!schema.includes('unitPrice             Float'), 'invoice line must not use floating-point price')

console.log('invoice-line-schema.test: PASS (INV/F M-02)')
