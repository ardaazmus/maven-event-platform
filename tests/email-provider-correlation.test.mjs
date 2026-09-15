import assert from 'node:assert'
import { readFileSync } from 'node:fs'
import { normalizeProviderMessageIdentity } from '../src/lib/email-provider-correlation.ts'

assert.deepEqual(
  normalizeProviderMessageIdentity({ provider: ' Mailchimp_Transactional ', providerMessageId: ' tx_123 ' }),
  { provider: 'mailchimp_transactional', providerMessageId: 'tx_123' },
)
assert.throws(() => normalizeProviderMessageIdentity({ provider: '', providerMessageId: 'tx_123' }), /provider_invalid/)
assert.throws(() => normalizeProviderMessageIdentity({ provider: 'stripe', providerMessageId: ' ' }), /provider_message_id_invalid/)
assert.throws(() => normalizeProviderMessageIdentity({ provider: 'stripe', providerMessageId: 'tx\r\n123' }), /provider_message_id_invalid/)
assert.throws(() => normalizeProviderMessageIdentity({ provider: 'stripe', providerMessageId: 'x'.repeat(257) }), /provider_message_id_invalid/)

const schema = readFileSync('prisma/schema.prisma', 'utf8')
const migration = readFileSync('prisma/migrations/20260903231500_add_outbox_provider_identity/migration.sql', 'utf8')
const model = schema.slice(schema.indexOf('model OutboxEvent {'), schema.indexOf('model EmailProviderEvent {'))
assert(/provider\s+String\?/.test(model), 'outbox must retain provider identity')
assert(/providerMessageId\s+String\?/.test(model), 'outbox must retain provider message identity')
assert(model.includes('@@index([workspaceId, provider, providerMessageId])'), 'outbox provider identity must be queryable')
assert(migration.includes('"providerMessageId" TEXT'), 'migration must add provider message identity')

console.log('email-provider-correlation.test: PASS (MAIL-12D)')
