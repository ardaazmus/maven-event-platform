import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const schema = readFileSync('prisma/schema.prisma', 'utf8')
const migration = readFileSync('prisma/migrations/20260902150000_add_payment_provider_connection_foundation/migration.sql', 'utf8')
const model = schema.slice(schema.indexOf('model PaymentProviderConnection {'), schema.indexOf('model PaymentAttempt {'))

assert(model.includes('workspaceId        String'), 'provider connection must be workspace scoped')
assert(model.includes('credentialsEnvelope String?'), 'provider credentials must use encrypted envelope storage')
assert(model.includes('publicConfigJson   String'), 'public provider metadata must be separated from credentials')
assert(model.includes('@@unique([workspaceId, provider, mode])'), 'a workspace cannot have duplicate provider connections per mode')
assert(!model.match(/\b(cardNumber|cvv|cvc|pan|rawToken|secretKey)\b/i), 'provider connection must not model card or raw secret fields')
assert(migration.includes('PaymentProviderConnection_workspaceId_fkey'), 'provider connections must have a workspace foreign key')
assert(migration.includes('PaymentProviderConnection_workspaceId_provider_mode_key'), 'provider/mode uniqueness must exist in migration')

console.log('payment-provider-connection-schema.test: PASS (PAY-04A)')
