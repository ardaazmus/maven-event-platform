import assert from 'node:assert/strict'
import fs from 'node:fs'

const schema = fs.readFileSync('prisma/schema.prisma', 'utf8')
const migration = fs.readFileSync('prisma/migrations/20260904010000_add_invoice_recipient_snapshot/migration.sql', 'utf8')
const model = schema.slice(schema.indexOf('model InvoiceRecipientSnapshot {'))

assert(model.includes('model InvoiceRecipientSnapshot {'))
assert.match(model, /workspaceId\s+String/)
assert.match(model, /paymentOrderId\s+String\s+@unique/)
assert.match(model, /legalNameEncrypted\s+String\?/)
assert.match(model, /taxNumberEncrypted\s+String\?/)
assert.match(model, /identityNumberEncrypted\s+String\?/)
assert.match(model, /emailEncrypted\s+String\?/)
assert.match(model, /billingAddressEncrypted\s+String\?/)
assert.match(model, /source\s+String/)
assert.match(model, /workspace\s+Workspace/)
assert.match(model, /paymentOrder\s+PaymentOrder/)
assert(migration.includes('CREATE TABLE "InvoiceRecipientSnapshot"'))
assert(migration.includes('InvoiceRecipientSnapshot_paymentOrderId_key'))
assert(migration.includes('InvoiceRecipientSnapshot_workspaceId_createdAt_idx'))
assert(migration.includes('InvoiceRecipientSnapshot_workspaceId_fkey'))
assert(migration.includes('InvoiceRecipientSnapshot_paymentOrderId_fkey'))

console.log('PASS invoice-recipient-schema tests')
