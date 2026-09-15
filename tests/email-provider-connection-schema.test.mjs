import assert from 'node:assert'
import { existsSync, readFileSync } from 'node:fs'

const schema = readFileSync('prisma/schema.prisma', 'utf8')
const migrationPath = 'prisma/migrations/20260903233000_add_email_provider_connection/migration.sql'
assert(existsSync(migrationPath), 'email provider connection migration must exist')
const migration = readFileSync(migrationPath, 'utf8')
const model = schema.slice(schema.indexOf('model EmailProviderConnection {'), schema.indexOf('model EmailPreference {'))

assert(model.includes('workspaceId'), 'email provider connection must be workspace scoped')
assert(model.includes('credentialsEnvelope'), 'email provider credentials must use encrypted envelope storage')
assert(model.includes('webhookSecretEnvelope'), 'webhook secret must use encrypted envelope storage')
assert(model.includes('publicConfigJson'), 'public provider metadata must be separated from secrets')
assert(model.includes('@@unique([workspaceId, provider])'), 'workspace cannot have duplicate email provider connections')
assert(!model.match(/\b(rawSecret|apiKey|webhookSecret|password|token)\s+String\??/i), 'plaintext secret fields must not be modeled')
assert(migration.includes('EmailProviderConnection_workspaceId_fkey'), 'email provider connection must have workspace foreign key')
assert(migration.includes('EmailProviderConnection_workspaceId_provider_key'), 'email provider connection uniqueness must exist')

console.log('email-provider-connection-schema.test: PASS (MAIL-13B)')
