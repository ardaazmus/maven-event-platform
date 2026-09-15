import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const route = readFileSync('src/app/api/public/email/unsubscribe/route.ts', 'utf8')
const schema = readFileSync('prisma/schema.prisma', 'utf8')
const migration = readFileSync('prisma/migrations/20260903223000_add_email_preferences/migration.sql', 'utf8')

assert(route.includes('verifyMarketingUnsubscribeToken'), 'unsubscribe route must verify signed token')
assert(route.includes('db.emailPreference.upsert'), 'unsubscribe route must update an idempotent preference record')
assert(route.includes('marketingOptOut: true'), 'unsubscribe route must only opt out marketing')
assert(!route.includes('recipientEmail'), 'unsubscribe route must not accept or expose recipient email')
assert(schema.includes('model EmailPreference'), 'email preference model must exist')
assert(schema.includes('@@unique([workspaceId, recipientHash])'), 'email preference must be unique per workspace and recipient hash')
assert(migration.includes('EmailPreference_workspaceId_recipientHash_key'), 'email preference uniqueness must exist in migration')

console.log('email-unsubscribe-route.test: PASS (MAIL-10)')
