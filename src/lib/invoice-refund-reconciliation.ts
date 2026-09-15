import type { PaymentOrderStatus } from '@/lib/payment-state'
import { invoiceStates, type InvoiceState } from '@/lib/invoice-state'

const refundStatuses = new Set<PaymentOrderStatus>(['refunded', 'partially_refunded', 'disputed'])
const reviewStates = new Set<InvoiceState>(invoiceStates)

export type InvoiceRefundReconciliationInput = {
  paymentStatus: PaymentOrderStatus
  eventKind: 'refund' | 'chargeback'
  invoiceState: string
}

export type InvoiceRefundReconciliationResult =
  | { status: 'review_required'; changed: boolean; nextInvoiceState: 'refund_or_credit_note_review'; deliveryAction: 'hold'; documentAction: 'remain_private'; accountingAction: 'manual_review' }
  | { status: 'already_under_review'; changed: false; nextInvoiceState: 'refund_or_credit_note_review'; deliveryAction: 'hold'; documentAction: 'remain_private'; accountingAction: 'manual_review' }
  | { status: 'no_invoice_action'; changed: false; deliveryAction: 'none'; documentAction: 'none'; accountingAction: 'none' }
  | { status: 'blocked'; reason: 'payment_state_invalid' | 'event_state_conflict' | 'invoice_state_invalid' }

/** Converts a verified refund/chargeback state into an accounting review hold. */
export function reconcileInvoiceRefund(input: InvoiceRefundReconciliationInput): InvoiceRefundReconciliationResult {
  if (!refundStatuses.has(input.paymentStatus)) return { status: 'blocked', reason: 'payment_state_invalid' }
  if ((input.eventKind === 'refund' && input.paymentStatus === 'disputed') || (input.eventKind === 'chargeback' && input.paymentStatus !== 'disputed')) return { status: 'blocked', reason: 'event_state_conflict' }
  if (!reviewStates.has(input.invoiceState as InvoiceState)) return { status: 'blocked', reason: 'invoice_state_invalid' }
  if (input.invoiceState === 'not_started') return { status: 'no_invoice_action', changed: false, deliveryAction: 'none', documentAction: 'none', accountingAction: 'none' }
  if (input.invoiceState === 'refund_or_credit_note_review') return { status: 'already_under_review', changed: false, nextInvoiceState: 'refund_or_credit_note_review', deliveryAction: 'hold', documentAction: 'remain_private', accountingAction: 'manual_review' }
  return { status: 'review_required', changed: true, nextInvoiceState: 'refund_or_credit_note_review', deliveryAction: 'hold', documentAction: 'remain_private', accountingAction: 'manual_review' }
}
