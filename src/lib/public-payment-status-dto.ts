import { normalizePaymentCurrency, type PaymentCurrency } from '@/lib/payment-money'
import { isPublicPaymentKey } from '@/lib/payment-status-key'

export type PublicPaymentStatus =
  | 'created'
  | 'requires_action'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'canceled'
  | 'refunded'
  | 'partially_refunded'

export type PublicPaymentStatusDto = {
  status: PublicPaymentStatus
  amountMinor: number
  currency: PaymentCurrency
}

const publicPaymentStatuses: readonly PublicPaymentStatus[] = [
  'created',
  'requires_action',
  'processing',
  'succeeded',
  'failed',
  'canceled',
  'refunded',
  'partially_refunded',
]

/** Builds the minimal public payment status view without internal or provider fields. */
export function sanitizePublicPaymentStatus(order: unknown): PublicPaymentStatusDto | null {
  if (!order || typeof order !== 'object' || Array.isArray(order)) return null
  const record = order as Record<string, unknown>
  if (!isPublicPaymentKey(record.publicKey)) return null
  if (typeof record.status !== 'string' || !publicPaymentStatuses.includes(record.status as PublicPaymentStatus)) return null
  const amountMinor = record.amountMinor
  if (!Number.isSafeInteger(amountMinor) || (amountMinor as number) <= 0) return null
  if (typeof record.currency !== 'string') return null
  const currency = normalizePaymentCurrency(record.currency)
  if (!currency) return null
  return {
    status: record.status as PublicPaymentStatus,
    amountMinor: amountMinor as number,
    currency,
  }
}
