import assert from 'node:assert'
import { existsSync, readFileSync } from 'node:fs'

const schema = readFileSync('prisma/schema.prisma', 'utf8')
const migrationPath = 'prisma/migrations/20260904000000_add_form_payment_config/migration.sql'

assert(schema.includes('model FormPaymentConfig {'), 'form payment config model must exist')

const modelStart = schema.indexOf('model FormPaymentConfig {')
const modelEnd = schema.indexOf('\n}\n', modelStart) + 3
const model = schema.slice(modelStart, modelEnd)

assert(/workspaceId\s+String/.test(model), 'form payment config must be workspace scoped')
assert(/formId\s+String\s+@unique/.test(model), 'each form must have one payment config')
assert(/connectionId\s+String\?/.test(model), 'provider credentials must remain in a separate connection')
assert(/pricingPolicyJson\s+String/.test(model), 'published pricing policy must be persisted explicitly')
assert(model.includes('@@index([workspaceId, enabled])'), 'payment configs must be queryable by workspace and enabled state')
assert(!model.match(/\b(credentialsEnvelope|webhookSecret|secretKey|apiKey|cardNumber|cvv|cvc|pan)\b/i), 'form payment config must not store secrets or card data')

assert(existsSync(migrationPath), 'form payment config migration must exist')
const migration = readFileSync(migrationPath, 'utf8')
assert(migration.includes('CREATE TABLE "FormPaymentConfig"'), 'migration must create the form payment config table')
assert(migration.includes('FormPaymentConfig_workspaceId_fkey'), 'migration must enforce workspace ownership')
assert(migration.includes('FormPaymentConfig_formId_key'), 'migration must enforce one config per form')

console.log('form-payment-config-schema.test: PASS (PAY-06D-01)')
