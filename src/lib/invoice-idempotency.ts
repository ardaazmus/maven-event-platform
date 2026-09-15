import { createHash } from 'node:crypto'

export type InvoiceIdempotencyPurpose =
  | 'invoice_record'
  | 'invoice_export'
  | 'invoice_import'
  | 'invoice_document'
  | 'invoice_delivery'

type InvoiceIdempotencyInput = {
  workspaceId: string
  paymentOrderId: string
  purpose: InvoiceIdempotencyPurpose
}

type InvoiceIdempotencyResult =
  | { ok: true; key: string }
  | { ok: false; reason: 'input_invalid' }

const validPurposes: readonly InvoiceIdempotencyPurpose[] = [
  'invoice_record',
  'invoice_export',
  'invoice_import',
  'invoice_document',
  'invoice_delivery',
]

function isBoundedIdentifier(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 255
}

export function buildInvoiceIdempotencyKey(input: InvoiceIdempotencyInput): InvoiceIdempotencyResult {
  if (!isBoundedIdentifier(input?.workspaceId)
    || !isBoundedIdentifier(input?.paymentOrderId)
    || !validPurposes.includes(input?.purpose)) {
    return { ok: false, reason: 'input_invalid' }
  }

  const canonical = [input.workspaceId, input.paymentOrderId, input.purpose].join('\u001f')
  const digest = createHash('sha256').update(canonical, 'utf8').digest('hex')
  return { ok: true, key: `inv_${digest}` }
}
