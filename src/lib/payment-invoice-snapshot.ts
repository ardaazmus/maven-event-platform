import { createHash } from 'node:crypto'

type SnapshotPaymentOrder = {
  id: string
  workspaceId: string
  provider: string
  status: string
  amountMinor: number
  currency: string
}

export type EncryptedInvoiceRecipientSnapshot = {
  recipientType: string
  legalNameEncrypted?: string | null
  taxNumberEncrypted?: string | null
  taxOfficeEncrypted?: string | null
  identityNumberEncrypted?: string | null
  emailEncrypted?: string | null
  billingAddressEncrypted?: string | null
  countryCode?: string | null
  source: string
  noticeVersion?: string | null
}

export type InvoiceLineSnapshotInput = {
  lineNumber: number
  description: string
  quantity: string
  unitPriceMinor: number
  taxRateBps?: number | null
  taxAmountMinor?: number | null
  discountAmountMinor?: number | null
  lineTotalMinor: number
  currency: string
}

type SnapshotTransaction = {
  invoiceRecipientSnapshot: {
    findUnique(args: { where: { paymentOrderId: string } }): Promise<Record<string, unknown> | null>
    create(args: { data: Record<string, unknown> }): Promise<{ id: string }>
  }
  invoiceRecord: {
    findUnique(args: { where: { paymentOrderId: string } }): Promise<Record<string, unknown> | null>
    create(args: { data: Record<string, unknown> }): Promise<{ id: string; state: string }>
  }
  invoiceLineSnapshot: {
    createMany(args: { data: Array<InvoiceLineSnapshotInput & { invoiceRecordId: string }> }): Promise<{ count: number }>
  }
}

export type PaymentInvoiceSnapshotInput = {
  order: SnapshotPaymentOrder
  recipient: EncryptedInvoiceRecipientSnapshot
  recipientValidationStatus: 'valid' | 'review_required' | 'invalid'
  documentType: string
  lines: InvoiceLineSnapshotInput[]
}

type PaymentInvoiceSnapshotResult =
  | { ok: true; reused: boolean; invoiceRecordId: string; state: 'paid_ready_for_invoicing' | 'accounting_review_required' }
  | { ok: false; reason: 'payment_not_succeeded' | 'order_invalid' | 'recipient_invalid' | 'lines_invalid' | 'amount_mismatch' | 'snapshot_conflict' }

function isSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value)
}

function snapshotFingerprint(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

function recipientFingerprint(value: Record<string, unknown>): string {
  return snapshotFingerprint({
    recipientType: value.recipientType ?? null,
    legalNameEncrypted: value.legalNameEncrypted ?? null,
    taxNumberEncrypted: value.taxNumberEncrypted ?? null,
    taxOfficeEncrypted: value.taxOfficeEncrypted ?? null,
    identityNumberEncrypted: value.identityNumberEncrypted ?? null,
    emailEncrypted: value.emailEncrypted ?? null,
    billingAddressEncrypted: value.billingAddressEncrypted ?? null,
    countryCode: value.countryCode ?? null,
    source: value.source ?? null,
    noticeVersion: value.noticeVersion ?? null,
  })
}

function invoiceFingerprint(value: Record<string, unknown>): string {
  return snapshotFingerprint({
    workspaceId: value.workspaceId ?? null,
    paymentOrderId: value.paymentOrderId ?? null,
    provider: value.provider ?? null,
    documentType: value.documentType ?? null,
    amountMinor: value.amountMinor ?? null,
    currency: value.currency ?? null,
    state: value.state ?? null,
  })
}

/**
 * Persists the recipient, invoice and line snapshots through one caller-owned
 * transaction. It accepts encrypted recipient values only and runs after a
 * verified succeeded payment, never on a browser callback.
 */
export async function persistPaymentInvoiceSnapshot(
  tx: SnapshotTransaction,
  input: PaymentInvoiceSnapshotInput,
): Promise<PaymentInvoiceSnapshotResult> {
  const { order, recipient, lines } = input
  if (!order.id || !order.workspaceId || !order.provider || order.status !== 'succeeded') return { ok: false, reason: 'payment_not_succeeded' }
  if (!isSafeInteger(order.amountMinor) || order.amountMinor <= 0 || !order.currency) return { ok: false, reason: 'order_invalid' }
  if (input.recipientValidationStatus === 'invalid') return { ok: false, reason: 'recipient_invalid' }
  if (!recipient.source || !recipient.recipientType || !input.documentType || lines.length === 0) return { ok: false, reason: 'lines_invalid' }

  const validLines = lines.every(line => line.currency === order.currency
    && Number.isInteger(line.lineNumber)
    && line.lineNumber > 0
    && line.quantity.trim().length > 0
    && isSafeInteger(line.unitPriceMinor)
    && line.unitPriceMinor >= 0
    && isSafeInteger(line.lineTotalMinor)
    && line.lineTotalMinor >= 0
    && (line.taxAmountMinor === null || line.taxAmountMinor === undefined || isSafeInteger(line.taxAmountMinor))
    && (line.discountAmountMinor === null || line.discountAmountMinor === undefined || isSafeInteger(line.discountAmountMinor)))
  if (!validLines) return { ok: false, reason: 'lines_invalid' }
  const total = lines.reduce((sum, line) => sum + line.lineTotalMinor, 0)
  if (total !== order.amountMinor) {
    return { ok: false, reason: 'amount_mismatch' }
  }

  const recipientData = { ...recipient, workspaceId: order.workspaceId, paymentOrderId: order.id }
  const existingRecipient = await tx.invoiceRecipientSnapshot.findUnique({ where: { paymentOrderId: order.id } })
  if (existingRecipient && recipientFingerprint(existingRecipient) !== recipientFingerprint(recipientData)) return { ok: false, reason: 'snapshot_conflict' }
  if (!existingRecipient) await tx.invoiceRecipientSnapshot.create({ data: recipientData })

  const state = input.recipientValidationStatus === 'review_required' ? 'accounting_review_required' : 'paid_ready_for_invoicing'
  const invoiceData = {
    workspaceId: order.workspaceId,
    paymentOrderId: order.id,
    provider: order.provider,
    documentType: input.documentType,
    amountMinor: order.amountMinor,
    currency: order.currency,
    state,
  }
  const existingInvoice = await tx.invoiceRecord.findUnique({ where: { paymentOrderId: order.id } })
  if (existingInvoice) {
    if (invoiceFingerprint(existingInvoice) !== invoiceFingerprint(invoiceData)) return { ok: false, reason: 'snapshot_conflict' }
    return { ok: true, reused: true, invoiceRecordId: String(existingInvoice.id), state: existingInvoice.state as 'paid_ready_for_invoicing' | 'accounting_review_required' }
  }

  const invoice = await tx.invoiceRecord.create({ data: invoiceData })
  await tx.invoiceLineSnapshot.createMany({ data: lines.map(line => ({ ...line, invoiceRecordId: invoice.id })) })
  return { ok: true, reused: false, invoiceRecordId: invoice.id, state }
}
