import assert from 'node:assert/strict'
import { redactAuditJson } from '../src/lib/audit-redaction.ts'
import { readFileSync } from 'node:fs'

const sensitive = redactAuditJson(JSON.stringify({
  invoiceRecordId: 'invoice-1',
  status: 'completed',
  email: 'person@example.com',
  recipientName: 'Person Example',
  token: 'provider-token',
  documentContent: 'private document body',
  nested: { state: 'issued', secret: 'hidden' },
}))
assert.deepEqual(sensitive, { invoiceRecordId: 'invoice-1', status: 'completed' })
assert.deepEqual(redactAuditJson('{not-json'), { redacted: true, reason: 'invalid_json' })
assert.equal(redactAuditJson(null), null)

const route = readFileSync('src/app/api/audit/route.ts', 'utf8')
assert(route.includes('redactAuditJson'), 'audit read route must use the redaction boundary')
assert(route.includes('actor: l.actor ? { id: l.actor.id } : null'), 'audit read route must not return actor PII')
assert(!route.includes('JSON.parse(l.beforeJson)') && !route.includes('JSON.parse(l.afterJson)'), 'audit read route must not parse arbitrary JSON directly')

console.log('audit-read-redaction.test: PASS (R-01)')
