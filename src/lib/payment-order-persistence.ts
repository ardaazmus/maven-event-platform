import type { PaymentOrderSnapshot } from '@/lib/payment-order-contract'
import { createPublicPaymentKey } from '@/lib/payment-status-key'

type PaymentOrderRecord = {
  id: string
  publicKey: string
  workspaceId: string
  formId: string
  publishedVersionId: string | null
  submissionId?: string | null
  provider: string
  mode: string
  idempotencyKey: string
  amountMinor: number
  currency: string
  status: string
}

type PaymentOrderDelegate = {
  findUnique(args: { where: { workspaceId_idempotencyKey: { workspaceId: string; idempotencyKey: string } } }): Promise<PaymentOrderRecord | null>
  create(args: { data: PaymentOrderSnapshot & { publicKey: string; submissionId: null } }): Promise<PaymentOrderRecord>
}

type PaymentOrderTransaction = {
  paymentOrder: PaymentOrderDelegate
}

type PaymentOrderPersistenceResult =
  | { created: true; order: PaymentOrderRecord }
  | { created: false; order: PaymentOrderRecord }
  | { created: false; conflict: 'snapshot_mismatch' }

function isUniqueViolation(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && (error as { code?: unknown }).code === 'P2002')
}

/** Creates or reuses an order inside the caller's Prisma transaction; no provider call is made. */
export async function createOrReusePaymentOrder(
  tx: PaymentOrderTransaction,
  snapshot: PaymentOrderSnapshot,
): Promise<PaymentOrderPersistenceResult> {
  const where = { workspaceId_idempotencyKey: { workspaceId: snapshot.workspaceId, idempotencyKey: snapshot.idempotencyKey } }
  const existing = await tx.paymentOrder.findUnique({ where })
  if (existing) {
    const matchesSnapshot = existing.workspaceId === snapshot.workspaceId
      && existing.formId === snapshot.formId
      && existing.publishedVersionId === snapshot.publishedVersionId
      && existing.provider === snapshot.provider
      && existing.mode === snapshot.mode
      && existing.idempotencyKey === snapshot.idempotencyKey
      && existing.amountMinor === snapshot.amountMinor
      && existing.currency === snapshot.currency
    return matchesSnapshot ? { created: false, order: existing } : { created: false, conflict: 'snapshot_mismatch' }
  }

  try {
    const order = await tx.paymentOrder.create({ data: { ...snapshot, publicKey: createPublicPaymentKey(), submissionId: null } })
    return { created: true, order }
  } catch (error) {
    if (!isUniqueViolation(error)) throw error
    const raced = await tx.paymentOrder.findUnique({ where })
    if (!raced) throw error
    const matchesSnapshot = raced.workspaceId === snapshot.workspaceId
      && raced.formId === snapshot.formId
      && raced.publishedVersionId === snapshot.publishedVersionId
      && raced.provider === snapshot.provider
      && raced.mode === snapshot.mode
      && raced.idempotencyKey === snapshot.idempotencyKey
      && raced.amountMinor === snapshot.amountMinor
      && raced.currency === snapshot.currency
    return matchesSnapshot ? { created: false, order: raced } : { created: false, conflict: 'snapshot_mismatch' }
  }
}
