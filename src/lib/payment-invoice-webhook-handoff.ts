import { getInvoiceFormConfig } from '@/lib/invoice-form-config'
import { encryptInvoicePii } from '@/lib/invoice-pii-crypto'
import { buildPaymentInvoiceSnapshotSource } from '@/lib/payment-invoice-snapshot-source'
import { persistPaymentInvoiceSnapshot } from '@/lib/payment-invoice-snapshot'

type HandoffOrder = {
  id: string
  workspaceId: string
  formId: string
  submissionId: string | null
  publishedVersionId: string | null
  provider: string
  status: string
  amountMinor: number
  currency: string
}

type HandoffTransaction = Parameters<typeof persistPaymentInvoiceSnapshot>[0] & {
  formVersion: {
    findUnique(args: { where: { id: string }; select: { schemaJson: true } }): Promise<{ schemaJson: string } | null>
  }
  submission: {
    findUnique(args: { where: { id: string }; select: { values: { select: { valueJson: true; field: { select: { fieldKey: true } } } } } }): Promise<{
      values: Array<{ valueJson: string; field: { fieldKey: string } }>
    } | null>
  }
}

type HandoffResult =
  | { ok: true; status: 'persisted' | 'review_required' | 'existing'; invoiceRecordId: string }
  | { ok: true; status: 'disabled' }
  | { ok: false; reason: 'payment_not_succeeded' | 'published_snapshot_missing' | 'submission_missing' | 'snapshot_invalid' | 'invoice_snapshot_failed' }

function submittedValues(values: Array<{ valueJson: string; field: { fieldKey: string } }>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const entry of values) {
    try {
      const parsed: unknown = JSON.parse(entry.valueJson)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && 'value' in parsed) {
        result[entry.field.fieldKey] = (parsed as { value?: unknown }).value
      }
    } catch {
      // A malformed field is deliberately omitted and sent to review if invoicing is enabled.
    }
  }
  return result
}

/** Handoffs a verified succeeded payment to invoice persistence without trusting callback/client state. */
export async function handoffSucceededPaymentToInvoice(
  tx: HandoffTransaction,
  order: HandoffOrder,
  env: NodeJS.ProcessEnv = process.env,
): Promise<HandoffResult> {
  if (order.status !== 'succeeded') return { ok: false, reason: 'payment_not_succeeded' }
  if (!order.publishedVersionId) return { ok: false, reason: 'published_snapshot_missing' }

  const existing = await tx.invoiceRecord.findUnique({ where: { paymentOrderId: order.id } })
  if (existing) return { ok: true, status: 'existing', invoiceRecordId: String(existing.id) }
  if (!order.submissionId) return { ok: false, reason: 'submission_missing' }

  const version = await tx.formVersion.findUnique({ where: { id: order.publishedVersionId }, select: { schemaJson: true } })
  if (!version) return { ok: false, reason: 'published_snapshot_missing' }
  let snapshot: Record<string, unknown>
  try {
    const parsed: unknown = JSON.parse(version.schemaJson)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('invalid snapshot')
    snapshot = parsed as Record<string, unknown>
  } catch {
    return { ok: false, reason: 'snapshot_invalid' }
  }

  const submission = await tx.submission.findUnique({
    where: { id: order.submissionId },
    select: { values: { select: { valueJson: true, field: { select: { fieldKey: true } } } } },
  })
  if (!submission) return { ok: false, reason: 'submission_missing' }

  const settings = snapshot.settings
  const config = getInvoiceFormConfig(settings)
  if (!config.enabled) return { ok: true, status: 'disabled' }

  const source = buildPaymentInvoiceSnapshotSource({
    order,
    formTitle: typeof snapshot.title === 'string' ? snapshot.title : '',
    settings,
    values: submittedValues(submission.values),
    encrypt: value => encryptInvoicePii(value, env),
  })
  if (!source.ok) {
    if (source.reason === 'invoice_disabled') return { ok: true, status: 'disabled' }
    if (source.reason !== 'recipient_not_ready') return { ok: false, reason: 'invoice_snapshot_failed' }
    const review = await tx.invoiceRecord.create({
      data: {
        workspaceId: order.workspaceId,
        paymentOrderId: order.id,
        provider: order.provider,
        documentType: 'invoice',
        amountMinor: order.amountMinor,
        currency: order.currency,
        state: 'accounting_review_required',
      },
    })
    return { ok: true, status: 'review_required', invoiceRecordId: String(review.id) }
  }

  const persisted = await persistPaymentInvoiceSnapshot(tx, {
    order,
    recipient: source.recipient,
    recipientValidationStatus: source.recipientValidationStatus,
    documentType: source.documentType,
    lines: source.lines,
  })
  if (!persisted.ok) return { ok: false, reason: 'invoice_snapshot_failed' }
  return { ok: true, status: persisted.reused ? 'existing' : 'persisted', invoiceRecordId: persisted.invoiceRecordId }
}
