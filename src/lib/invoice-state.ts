export const invoiceStates = [
  'not_started',
  'paid_ready_for_invoicing',
  'accounting_review_required',
  'queued',
  'provider_draft_submitting',
  'provider_draft_created',
  'reconciliation_required',
  'formalization_submitting',
  'formalization_pending',
  'formalization_polling',
  'issued',
  'document_ready',
  'delivery_queued',
  'sent',
  'blocked_payment_state',
  'provider_error',
  'formalization_error',
  'delivery_failed',
  'delivery_suppressed',
  'refund_or_credit_note_review',
] as const

export type InvoiceState = (typeof invoiceStates)[number]

type InvoiceTransitionResult =
  | { accepted: true; changed: boolean; status: InvoiceState }
  | { accepted: false; changed: false; status: string; reason: 'state_invalid' | 'transition_not_allowed' }

const transitions: Record<InvoiceState, readonly InvoiceState[]> = {
  not_started: ['paid_ready_for_invoicing'],
  paid_ready_for_invoicing: ['accounting_review_required', 'queued', 'blocked_payment_state', 'refund_or_credit_note_review'],
  accounting_review_required: ['queued', 'blocked_payment_state', 'refund_or_credit_note_review'],
  queued: ['provider_draft_submitting', 'provider_error', 'accounting_review_required', 'refund_or_credit_note_review'],
  provider_draft_submitting: ['provider_draft_created', 'reconciliation_required', 'provider_error', 'refund_or_credit_note_review'],
  provider_draft_created: ['formalization_submitting', 'provider_error', 'refund_or_credit_note_review'],
  formalization_submitting: ['formalization_pending', 'reconciliation_required', 'provider_error', 'refund_or_credit_note_review'],
  reconciliation_required: ['queued', 'accounting_review_required'],
  formalization_pending: ['formalization_polling', 'issued', 'formalization_error', 'provider_error', 'reconciliation_required', 'refund_or_credit_note_review'],
  formalization_polling: ['formalization_pending', 'issued', 'formalization_error', 'provider_error', 'reconciliation_required', 'refund_or_credit_note_review'],
  issued: ['document_ready', 'refund_or_credit_note_review'],
  document_ready: ['delivery_queued', 'refund_or_credit_note_review'],
  delivery_queued: ['sent', 'delivery_failed', 'refund_or_credit_note_review'],
  sent: ['refund_or_credit_note_review'],
  blocked_payment_state: ['accounting_review_required'],
  provider_error: ['queued', 'accounting_review_required', 'refund_or_credit_note_review'],
  formalization_error: ['formalization_pending', 'accounting_review_required', 'refund_or_credit_note_review'],
  delivery_failed: ['delivery_queued', 'delivery_suppressed', 'refund_or_credit_note_review'],
  delivery_suppressed: ['delivery_queued', 'refund_or_credit_note_review'],
  refund_or_credit_note_review: [],
}

function isInvoiceState(value: string): value is InvoiceState {
  return (invoiceStates as readonly string[]).includes(value)
}

export function evaluateInvoiceTransition(current: string, next: string): InvoiceTransitionResult {
  if (!isInvoiceState(current) || !isInvoiceState(next)) {
    return { accepted: false, changed: false, status: current, reason: 'state_invalid' }
  }

  if (current === next) {
    return { accepted: true, changed: false, status: current }
  }

  if (!transitions[current].includes(next)) {
    return { accepted: false, changed: false, status: current, reason: 'transition_not_allowed' }
  }

  return { accepted: true, changed: true, status: next }
}
