import assert from 'node:assert/strict'
import { evaluateTenantInvoiceMailBoundary } from '../src/lib/tenant-invoice-mail.ts'

const base = {
  tenantId: 'tenant-1',
  invoiceWorkspaceId: 'tenant-1',
  documentWorkspaceId: 'tenant-1',
  senderWorkspaceId: 'tenant-1',
  invoiceModuleEnabled: true,
  invoiceSource: 'manual_accounting',
  invoiceState: 'document_ready',
  documentState: 'quarantined',
  scanStatus: 'clean',
  senderMessageClass: 'transactional',
  senderHealthStatus: 'healthy',
  senderEnabled: true,
  recipientPresent: true,
  providerSecret: 'must-not-return',
  recipientEmail: 'must-not-return',
}

assert.deepEqual(evaluateTenantInvoiceMailBoundary(base), {
  allowed: true,
  scope: 'tenant',
  invoiceSource: 'manual_accounting',
  messageClass: 'transactional',
})
assert.deepEqual(evaluateTenantInvoiceMailBoundary({ ...base, documentWorkspaceId: 'tenant-2' }), { allowed: false, scope: 'tenant', reason: 'tenant_scope_mismatch' })
assert.deepEqual(evaluateTenantInvoiceMailBoundary({ ...base, invoiceSource: 'parasut_v4' }), { allowed: false, scope: 'tenant', reason: 'parasut_deferred' })
assert.deepEqual(evaluateTenantInvoiceMailBoundary({ ...base, documentState: 'published' }), { allowed: false, scope: 'tenant', reason: 'document_not_ready' })
assert.deepEqual(evaluateTenantInvoiceMailBoundary({ ...base, senderHealthStatus: 'pending_verification' }), { allowed: false, scope: 'tenant', reason: 'sender_not_ready' })
assert.deepEqual(evaluateTenantInvoiceMailBoundary({ ...base, recipientPresent: false }), { allowed: false, scope: 'tenant', reason: 'recipient_missing' })
assert(!JSON.stringify(evaluateTenantInvoiceMailBoundary(base)).includes('must-not-return'))

console.log('v4-tenant-byo-invoice-mail.test: PASS (provider-neutral boundary)')
