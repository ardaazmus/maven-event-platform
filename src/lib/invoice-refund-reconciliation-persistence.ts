import type { PrismaClient } from '@prisma/client'
import { evaluateInvoiceTransition } from '@/lib/invoice-state'
import { reconcileInvoiceRefund, type InvoiceRefundReconciliationInput } from '@/lib/invoice-refund-reconciliation'

type RefundPersistenceClient = Pick<PrismaClient, '$transaction'>

export type InvoiceRefundPersistenceInput = InvoiceRefundReconciliationInput & {
  workspaceId: string
  invoiceRecordId: string
}

export type InvoiceRefundPersistenceResult =
  | { status: 'review_required'; invoiceRecordId: string }
  | { status: 'duplicate'; invoiceRecordId: string }
  | { status: 'no_invoice_action' }
  | { status: 'blocked'; reason: 'input_invalid' | 'scope_mismatch' | 'payment_state_invalid' | 'event_state_conflict' | 'invoice_state_invalid' | 'transition_not_allowed' | 'state_changed' }

function required(value: string): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

/** Applies a verified refund/chargeback hold with tenant scope and CAS semantics. */
export async function persistInvoiceRefundReview(
  input: InvoiceRefundPersistenceInput,
  client: RefundPersistenceClient,
): Promise<InvoiceRefundPersistenceResult> {
  if (!required(input.workspaceId) || !required(input.invoiceRecordId)) return { status: 'blocked', reason: 'input_invalid' }
  const contract = reconcileInvoiceRefund(input)
  if (contract.status === 'blocked') return contract
  if (contract.status === 'no_invoice_action') return { status: 'no_invoice_action' }

  return client.$transaction(async tx => {
    const invoice = await tx.invoiceRecord.findFirst({
      where: { id: input.invoiceRecordId, workspaceId: input.workspaceId, paymentOrder: { workspaceId: input.workspaceId } },
      select: { id: true, state: true },
    })
    if (!invoice) return { status: 'blocked', reason: 'scope_mismatch' }
    if (invoice.state === 'refund_or_credit_note_review') return { status: 'duplicate', invoiceRecordId: invoice.id }
    const transition = evaluateInvoiceTransition(invoice.state, contract.nextInvoiceState)
    if (!transition.accepted) return { status: 'blocked', reason: 'transition_not_allowed' }
    const updated = await tx.invoiceRecord.updateMany({ where: { id: invoice.id, workspaceId: input.workspaceId, state: invoice.state }, data: { state: contract.nextInvoiceState } })
    if (updated.count !== 1) return { status: 'blocked', reason: 'state_changed' }
    await tx.auditLog.create({ data: { workspaceId: input.workspaceId, action: 'invoice.refund_or_credit_note_review', resourceType: 'invoice_record', resourceId: invoice.id, beforeJson: JSON.stringify({ invoiceState: invoice.state }), afterJson: JSON.stringify({ invoiceState: contract.nextInvoiceState, paymentStatus: input.paymentStatus, eventKind: input.eventKind, deliveryAction: 'hold', accountingAction: 'manual_review' }) } })
    return { status: 'review_required', invoiceRecordId: invoice.id }
  })
}
