import type { PaymentOrderStatus } from '@/lib/payment-state'
import { evaluateInvoiceTransition } from '@/lib/invoice-state'
import { reconcileInvoiceRefund } from '@/lib/invoice-refund-reconciliation'
import type { InvoiceRefundPersistenceInput, InvoiceRefundPersistenceResult } from '@/lib/invoice-refund-reconciliation-persistence'

type PersistRefundReview = (input: InvoiceRefundPersistenceInput) => Promise<InvoiceRefundPersistenceResult>

type RefundReviewTransaction = {
  invoiceRecord: {
    updateMany(args: {
      where: { id: string; workspaceId: string; state: string }
      data: { state: 'refund_or_credit_note_review' }
    }): Promise<{ count: number }>
  }
  auditLog: {
    create(args: { data: { workspaceId: string; action: string; resourceType: string; resourceId: string; beforeJson: string; afterJson: string } }): Promise<unknown>
  }
}

export type VerifiedPaymentInvoiceRefundInput = {
  verified: true
  workspaceId: string
  paymentOrderId: string
  paymentStatus: PaymentOrderStatus
  eventKind: 'refund' | 'chargeback'
  invoice: { id: string; workspaceId: string; paymentOrderId: string; state: string } | null
}

export type PaymentInvoiceRefundHandoffResult =
  | { status: 'not_applicable' }
  | { status: 'blocked'; reason: 'verification_required' | 'input_invalid' | 'scope_mismatch' | 'payment_state_invalid' | 'event_state_conflict' | 'invoice_state_invalid' | 'transition_not_allowed' | 'state_changed' }
  | { status: 'review_required' | 'duplicate' | 'no_invoice_action'; invoiceRecordId?: string }

/** Persists the review state on an existing transaction client; no nested transaction is opened. */
export async function persistInvoiceRefundReviewInTransaction(
  input: InvoiceRefundPersistenceInput,
  invoice: { id: string; workspaceId: string; paymentOrderId: string; state: string },
  tx: RefundReviewTransaction,
): Promise<InvoiceRefundPersistenceResult> {
  const contract = reconcileInvoiceRefund(input)
  if (contract.status === 'blocked') return contract
  if (contract.status === 'no_invoice_action') return { status: 'no_invoice_action' }
  if (invoice.id !== input.invoiceRecordId || invoice.workspaceId !== input.workspaceId) return { status: 'blocked', reason: 'scope_mismatch' }
  if (invoice.state === 'refund_or_credit_note_review') return { status: 'duplicate', invoiceRecordId: invoice.id }

  const transition = evaluateInvoiceTransition(invoice.state, contract.nextInvoiceState)
  if (!transition.accepted) return { status: 'blocked', reason: 'transition_not_allowed' }
  const updated = await tx.invoiceRecord.updateMany({
    where: { id: invoice.id, workspaceId: input.workspaceId, state: invoice.state },
    data: { state: contract.nextInvoiceState },
  })
  if (updated.count !== 1) return { status: 'blocked', reason: 'state_changed' }
  await tx.auditLog.create({
    data: {
      workspaceId: input.workspaceId,
      action: 'invoice.refund_or_credit_note_review',
      resourceType: 'invoice_record',
      resourceId: invoice.id,
      beforeJson: JSON.stringify({ invoiceState: invoice.state }),
      afterJson: JSON.stringify({ invoiceState: contract.nextInvoiceState, paymentStatus: input.paymentStatus, eventKind: input.eventKind, deliveryAction: 'hold', accountingAction: 'manual_review' }),
    },
  })
  return { status: 'review_required', invoiceRecordId: invoice.id }
}

/** Connects a verified payment state to invoice review without trusting client state. */
export async function handoffVerifiedPaymentRefundToInvoice(
  input: VerifiedPaymentInvoiceRefundInput | Omit<VerifiedPaymentInvoiceRefundInput, 'verified'> & { verified: false },
  persist: PersistRefundReview,
): Promise<PaymentInvoiceRefundHandoffResult> {
  if (input.verified !== true) return { status: 'blocked', reason: 'verification_required' }
  if (!input.invoice) return { status: 'not_applicable' }
  if (!input.invoice.id.trim() || !input.invoice.state.trim()) return { status: 'blocked', reason: 'input_invalid' }
  if (!input.workspaceId.trim() || !input.paymentOrderId.trim() || input.invoice.workspaceId !== input.workspaceId || input.invoice.paymentOrderId !== input.paymentOrderId) return { status: 'blocked', reason: 'scope_mismatch' }

  const result = await persist({
    workspaceId: input.workspaceId,
    invoiceRecordId: input.invoice.id,
    paymentStatus: input.paymentStatus,
    eventKind: input.eventKind,
    invoiceState: input.invoice.state,
  })
  if (result.status === 'review_required' || result.status === 'duplicate') return { status: result.status, invoiceRecordId: result.invoiceRecordId }
  if (result.status === 'blocked') return result
  return { status: result.status }
}
