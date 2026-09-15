import { getInvoiceFormConfig } from '@/lib/invoice-form-config'
import { captureInvoiceRecipient } from '@/lib/invoice-recipient-capture'
import type { EncryptedInvoiceRecipientSnapshot, InvoiceLineSnapshotInput } from '@/lib/payment-invoice-snapshot'

type PaymentInvoiceSourceInput = {
  order: {
    id: string
    workspaceId: string
    provider: string
    status: string
    amountMinor: number
    currency: string
  }
  formTitle: string
  settings: unknown
  values: Record<string, unknown>
  encrypt: (value: string) => string
}

type PaymentInvoiceSnapshotSourceResult =
  | {
      ok: true
      documentType: 'invoice'
      recipientValidationStatus: 'valid' | 'review_required'
      recipient: EncryptedInvoiceRecipientSnapshot
      lines: InvoiceLineSnapshotInput[]
    }
  | { ok: false; reason: 'invoice_disabled' | 'recipient_not_ready' | 'order_invalid' }

/** Builds a server-owned invoice source from a published form mapping and a verified payment order. */
export function buildPaymentInvoiceSnapshotSource(input: PaymentInvoiceSourceInput): PaymentInvoiceSnapshotSourceResult {
  const { order } = input
  if (!order.id || !order.workspaceId || !order.provider || order.status !== 'succeeded'
    || !Number.isSafeInteger(order.amountMinor) || order.amountMinor <= 0
    || !order.currency || !input.formTitle.trim()) return { ok: false, reason: 'order_invalid' }

  const config = getInvoiceFormConfig(input.settings)
  if (!config.enabled) return { ok: false, reason: 'invoice_disabled' }

  const captured = captureInvoiceRecipient({ config, values: input.values, encrypt: input.encrypt })
  if (!captured.ok) return { ok: false, reason: 'recipient_not_ready' }

  const lines: InvoiceLineSnapshotInput[] = [{
    lineNumber: 1,
    description: input.formTitle.trim().slice(0, 500),
    quantity: '1',
    unitPriceMinor: order.amountMinor,
    lineTotalMinor: order.amountMinor,
    currency: order.currency,
  }]
  return {
    ok: true,
    documentType: 'invoice',
    recipientValidationStatus: captured.validationStatus,
    recipient: captured.recipient,
    lines,
  }
}
