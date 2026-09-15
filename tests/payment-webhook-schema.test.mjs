import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const schema = readFileSync('prisma/schema.prisma', 'utf8')
const migration = readFileSync('prisma/migrations/20260902153000_add_payment_webhook_inbox_foundation/migration.sql', 'utf8')
const model = schema.slice(schema.indexOf('model PaymentWebhookEvent {'), schema.indexOf('model PaymentAttempt {'))

assert(model.includes('payloadHash'), 'webhook inbox must store a payload hash')
assert(model.includes('providerPaymentId'), 'webhook inbox must store provider payment identity for matching')
assert(model.includes('amountMinor'), 'webhook inbox must store normalized amount metadata')
assert(model.includes('currency'), 'webhook inbox must store normalized currency metadata')
assert(model.includes('lockedUntil'), 'webhook inbox must support recoverable leases')
assert(model.includes('lockedBy'), 'webhook inbox lease owner must be explicit')
assert(model.includes('signatureVerified   Boolean   @default(false)'), 'webhook event signature state must be explicit')
assert(model.includes('@@unique([workspaceId, provider, externalEventId])'), 'webhook event delivery must be idempotent per workspace/provider')
assert(!model.includes('rawPayload') && !model.includes('payloadJson'), 'raw webhook payload must not be persisted')
assert(migration.includes('PaymentWebhookEvent_workspaceId_provider_externalEventId_key'), 'webhook idempotency must exist in migration')
assert(migration.includes('PaymentWebhookEvent_connectionId_fkey'), 'webhook event must be tied to provider connection')

console.log('payment-webhook-schema.test: PASS (PAY-05A)')
