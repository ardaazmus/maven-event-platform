type BindablePaymentOrder = {
  id: string
  workspaceId: string
  formId: string
  submissionId: string | null
  status: string
}

type BindingTransaction = {
  paymentOrder: {
    findUnique(args: { where: { id: string } }): Promise<BindablePaymentOrder | null>
    update(args: { where: { id: string }; data: { submissionId: string } }): Promise<BindablePaymentOrder>
  }
}

type PaymentSubmissionBindingInput = {
  paymentOrderId: string
  submissionId: string
  workspaceId: string
  formId: string
}

type PaymentSubmissionBindingResult =
  | { ok: true; reused: boolean; paymentOrderId: string; submissionId: string }
  | { ok: false; reason: 'payment_order_not_found' | 'submission_conflict' | 'order_not_bindable' }

function isIdentifier(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 200 && !/[\r\n]/.test(value)
}

/** Binds one verified form submission to its payment order without overwriting an existing binding. */
export async function bindPaymentOrderToSubmission(
  tx: BindingTransaction,
  input: PaymentSubmissionBindingInput,
): Promise<PaymentSubmissionBindingResult> {
  if (!isIdentifier(input.paymentOrderId) || !isIdentifier(input.submissionId)
    || !isIdentifier(input.workspaceId) || !isIdentifier(input.formId)) {
    return { ok: false, reason: 'payment_order_not_found' }
  }

  const order = await tx.paymentOrder.findUnique({ where: { id: input.paymentOrderId } })
  if (!order || order.workspaceId !== input.workspaceId || order.formId !== input.formId) {
    return { ok: false, reason: 'payment_order_not_found' }
  }
  if (order.submissionId === input.submissionId) {
    return { ok: true, reused: true, paymentOrderId: order.id, submissionId: input.submissionId }
  }
  if (order.submissionId !== null) return { ok: false, reason: 'submission_conflict' }
  if (!['created', 'requires_action', 'processing'].includes(order.status)) {
    return { ok: false, reason: 'order_not_bindable' }
  }

  await tx.paymentOrder.update({ where: { id: order.id }, data: { submissionId: input.submissionId } })
  return { ok: true, reused: false, paymentOrderId: order.id, submissionId: input.submissionId }
}
