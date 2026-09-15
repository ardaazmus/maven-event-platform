const SAFE_ID = /^[A-Za-z0-9._:-]{1,120}$/
const STAGES = ['invoice', 'document_ready', 'mail'] as const

export type PaymentInvoiceMailStage = (typeof STAGES)[number]
type Scope = Readonly<{ workspaceId: string; formId: string; submissionId: string }>

export type PaymentInvoiceMailChainInput = Readonly<{
  requestedStage: PaymentInvoiceMailStage
  replay?: boolean
  payment: Readonly<{ orderId: string; status: string; scope: Scope }>
  invoice?: Readonly<{ id: string; paymentOrderId: string; state: string; scope: Scope }>
  document?: Readonly<{ id: string; invoiceRecordId: string; state: string; scanStatus: string; readyAtMs: number | null; scope: Scope }>
  delivery?: Readonly<{ id: string; invoiceRecordId: string; documentId: string; status: string; outboxStatus: string; scope: Scope; idempotencyKey: string }>
}>

export type PaymentInvoiceMailChainResult =
  | { allowed: true; stage: PaymentInvoiceMailStage; outcome: 'ready' | 'duplicate'; correlation: Readonly<{ orderId: string; invoiceId: string; documentId: string | null; deliveryId: string | null }> }
  | { allowed: false; reason: 'input_invalid' | 'payment_not_succeeded' | 'invoice_evidence_missing' | 'invoice_scope_mismatch' | 'invoice_not_ready' | 'document_evidence_missing' | 'document_scope_mismatch' | 'document_not_ready' | 'delivery_evidence_missing' | 'delivery_scope_mismatch' | 'delivery_not_ready' | 'replay_without_idempotency' }

function isId(value: unknown): value is string {
  return typeof value === 'string' && SAFE_ID.test(value)
}

function isScope(value: unknown): value is Scope {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const scope = value as Scope
  return isId(scope.workspaceId) && isId(scope.formId) && isId(scope.submissionId)
}

function sameScope(left: Scope, right: Scope): boolean {
  return left.workspaceId === right.workspaceId && left.formId === right.formId && left.submissionId === right.submissionId
}

/** Verifies stage-specific correlation without implying that a payment created a document or sent mail. */
export function evaluatePaymentInvoiceMailChain(input: PaymentInvoiceMailChainInput): PaymentInvoiceMailChainResult {
  if (!input || !STAGES.includes(input.requestedStage) || !input.payment || !isId(input.payment.orderId) || !isScope(input.payment.scope)) return { allowed: false, reason: 'input_invalid' }
  if (input.payment.status !== 'succeeded') return { allowed: false, reason: 'payment_not_succeeded' }
  if (!input.invoice || !isId(input.invoice.id) || !isId(input.invoice.paymentOrderId) || !isScope(input.invoice.scope)) return { allowed: false, reason: 'invoice_evidence_missing' }
  if (input.invoice.paymentOrderId !== input.payment.orderId || !sameScope(input.invoice.scope, input.payment.scope)) return { allowed: false, reason: 'invoice_scope_mismatch' }
  if (!['issued', 'document_ready', 'delivery_queued'].includes(input.invoice.state)) return { allowed: false, reason: 'invoice_not_ready' }
  if (input.requestedStage === 'invoice') return { allowed: true, stage: 'invoice', outcome: input.replay === true ? 'duplicate' : 'ready', correlation: { orderId: input.payment.orderId, invoiceId: input.invoice.id, documentId: null, deliveryId: null } }

  if (!input.document || !isId(input.document.id) || !isId(input.document.invoiceRecordId) || !isScope(input.document.scope) || !Number.isSafeInteger(input.document.readyAtMs)) return { allowed: false, reason: 'document_evidence_missing' }
  if (input.document.invoiceRecordId !== input.invoice.id || !sameScope(input.document.scope, input.payment.scope)) return { allowed: false, reason: 'document_scope_mismatch' }
  if (input.invoice.state !== 'document_ready' && input.invoice.state !== 'delivery_queued') return { allowed: false, reason: 'document_not_ready' }
  if (input.document.state !== 'quarantined' || input.document.scanStatus !== 'clean' || input.document.readyAtMs === null) return { allowed: false, reason: 'document_not_ready' }
  if (input.requestedStage === 'document_ready') return { allowed: true, stage: 'document_ready', outcome: input.replay === true ? 'duplicate' : 'ready', correlation: { orderId: input.payment.orderId, invoiceId: input.invoice.id, documentId: input.document.id, deliveryId: null } }

  if (!input.delivery || !isId(input.delivery.id) || !isId(input.delivery.invoiceRecordId) || !isId(input.delivery.documentId) || !isId(input.delivery.idempotencyKey) || !isScope(input.delivery.scope)) return { allowed: false, reason: 'delivery_evidence_missing' }
  if (input.delivery.invoiceRecordId !== input.invoice.id || input.delivery.documentId !== input.document.id || !sameScope(input.delivery.scope, input.payment.scope)) return { allowed: false, reason: 'delivery_scope_mismatch' }
  if (!['queued', 'sending', 'sent'].includes(input.delivery.status) || !['queued', 'sending', 'sent'].includes(input.delivery.outboxStatus)) return { allowed: false, reason: 'delivery_not_ready' }
  if (input.replay === true && !input.delivery.idempotencyKey) return { allowed: false, reason: 'replay_without_idempotency' }
  return { allowed: true, stage: 'mail', outcome: input.replay === true ? 'duplicate' : 'ready', correlation: { orderId: input.payment.orderId, invoiceId: input.invoice.id, documentId: input.document.id, deliveryId: input.delivery.id } }
}
