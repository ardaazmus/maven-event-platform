export const TENANT_INVOICE_SOURCES = ['manual_accounting', 'parasut_v4'] as const
export type TenantInvoiceSource = (typeof TENANT_INVOICE_SOURCES)[number]

type TenantInvoiceMailFailure =
  | 'input_invalid'
  | 'tenant_scope_mismatch'
  | 'invoice_not_ready'
  | 'document_not_ready'
  | 'sender_not_ready'
  | 'recipient_missing'
  | 'source_invalid'
  | 'parasut_deferred'
  | 'module_disabled'

export type TenantInvoiceMailResult =
  | { allowed: true; scope: 'tenant'; invoiceSource: 'manual_accounting'; messageClass: 'transactional' }
  | { allowed: false; scope: 'unknown' | 'tenant'; reason: TenantInvoiceMailFailure }

function requiredString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

/**
 * Keeps a tenant's invoice source and billing sender separate from other
 * tenants. This is a provider-neutral decision boundary; it performs no
 * invoice, provider or email mutation and never returns input secrets/PII.
 */
export function evaluateTenantInvoiceMailBoundary(input: unknown): TenantInvoiceMailResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { allowed: false, scope: 'unknown', reason: 'input_invalid' }
  const value = input as Record<string, unknown>
  const ids = ['tenantId', 'invoiceWorkspaceId', 'documentWorkspaceId', 'senderWorkspaceId']
  if (ids.some((key) => !requiredString(value[key]))) return { allowed: false, scope: 'unknown', reason: 'input_invalid' }
  if (ids.some((key) => value[key] !== value.tenantId)) return { allowed: false, scope: 'tenant', reason: 'tenant_scope_mismatch' }
  if (value.invoiceModuleEnabled !== true) return { allowed: false, scope: 'tenant', reason: 'module_disabled' }
  if (value.invoiceSource !== 'manual_accounting' && value.invoiceSource !== 'parasut_v4') return { allowed: false, scope: 'tenant', reason: 'source_invalid' }
  if (value.invoiceSource === 'parasut_v4') return { allowed: false, scope: 'tenant', reason: 'parasut_deferred' }
  if (value.invoiceState !== 'document_ready') return { allowed: false, scope: 'tenant', reason: 'invoice_not_ready' }
  if (value.documentState !== 'quarantined' || value.scanStatus !== 'clean') return { allowed: false, scope: 'tenant', reason: 'document_not_ready' }
  if (value.senderMessageClass !== 'transactional' || value.senderHealthStatus !== 'healthy' || value.senderEnabled !== true) return { allowed: false, scope: 'tenant', reason: 'sender_not_ready' }
  if (value.recipientPresent !== true) return { allowed: false, scope: 'tenant', reason: 'recipient_missing' }
  return { allowed: true, scope: 'tenant', invoiceSource: 'manual_accounting', messageClass: 'transactional' }
}
