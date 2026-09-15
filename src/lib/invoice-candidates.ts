type CandidateOrder = {
  id: string
  workspaceId: string
  formId: string
  submissionId: string | null
  publishedVersionId: string | null
  provider: string
  status: string
  createdAt: Date | string
  amountMinor: number
  currency: string
  paymentStatus?: string | null
  invoiceRecordId?: string | null
}

export type InvoiceCandidate = {
  id: string
  workspaceId: string
  formId: string
  submissionId: string
  publishedVersionId: string
  provider: string
  status: 'succeeded'
  createdAt: string
  amountMinor: number
  currency: string
}

function boundedId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 255
}

function isValidMoney(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

function isCandidate(order: CandidateOrder, workspaceId: string): order is CandidateOrder & {
  submissionId: string
  publishedVersionId: string
} {
  return order.workspaceId === workspaceId
    && order.status === 'succeeded'
    && (order.paymentStatus === undefined || order.paymentStatus === null || order.paymentStatus === 'paid')
    && order.invoiceRecordId == null
    && boundedId(order.id)
    && boundedId(order.formId)
    && boundedId(order.submissionId)
    && boundedId(order.publishedVersionId)
    && boundedId(order.provider)
    && isValidMoney(order.amountMinor)
    && (order.createdAt instanceof Date || (typeof order.createdAt === 'string' && !Number.isNaN(Date.parse(order.createdAt))))
    && typeof order.currency === 'string'
    && /^[A-Z]{3}$/.test(order.currency)
}

/**
 * Selects only server-confirmed, tenant-scoped payment orders that still need
 * an invoice. It never infers payment success from a client or UI value.
 */
export function selectInvoiceCandidates(orders: readonly CandidateOrder[], workspaceId: string): InvoiceCandidate[] {
  if (!boundedId(workspaceId)) return []

  return orders.filter(order => isCandidate(order, workspaceId)).map(order => ({
    id: order.id,
    workspaceId: order.workspaceId,
    formId: order.formId,
    submissionId: order.submissionId,
    publishedVersionId: order.publishedVersionId,
    provider: order.provider,
    status: 'succeeded',
    createdAt: new Date(order.createdAt).toISOString(),
    amountMinor: order.amountMinor,
    currency: order.currency,
  }))
}
