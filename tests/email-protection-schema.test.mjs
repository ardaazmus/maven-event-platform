import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const schema = readFileSync('prisma/schema.prisma', 'utf8')
const migration = readFileSync('prisma/migrations/20260903001500_add_email_protection/migration.sql', 'utf8')
const suppressionModel = schema.slice(schema.indexOf('model EmailSuppression {'), schema.indexOf('model WorkspaceEmailProtection {'))
const protectionModel = schema.slice(schema.indexOf('model WorkspaceEmailProtection {'), schema.indexOf('model WorkspaceBranding {'))

assert(suppressionModel.includes('recipientHash'), 'suppression must store a hashed recipient identifier')
assert(suppressionModel.includes('scope'), 'suppression scope must distinguish all and marketing')
assert(suppressionModel.includes('sourceEventId'), 'suppression must retain the source event identity')
assert(suppressionModel.includes('@@unique([workspaceId, recipientHash, scope])'), 'suppression must be idempotent per workspace, recipient and scope')
assert(protectionModel.includes('marketingPaused'), 'workspace marketing pause must be durable')
assert(protectionModel.includes('@@unique([workspaceId])'), 'workspace protection must have one state per workspace')
assert(migration.includes('CREATE TABLE "EmailSuppression"'), 'suppression migration must create its table')
assert(migration.includes('CREATE TABLE "WorkspaceEmailProtection"'), 'workspace protection migration must create its table')
assert(migration.includes('EmailSuppression_workspaceId_recipientHash_scope_key'), 'suppression idempotency must exist in migration')
assert(!suppressionModel.includes('recipientEmail String'), 'suppression must not store plaintext recipient email')

console.log('email-protection-schema.test: PASS (MAIL-14A)')
