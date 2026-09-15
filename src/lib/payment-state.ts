export type PaymentOrderStatus =
  | 'created'
  | 'requires_action'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'canceled'
  | 'refunded'
  | 'partially_refunded'
  | 'disputed'

export type PaymentEventStatus = Exclude<PaymentOrderStatus, 'created'>

export interface PaymentOrderSnapshot {
  provider: string
  providerOrderId: string | null
  amountMinor: number
  currency: string
  status: PaymentOrderStatus
}

export interface VerifiedPaymentEvent {
  provider: string
  providerPaymentId: string
  signatureVerified: boolean
  targetStatus: PaymentEventStatus
  amountMinor?: number
  currency?: string
}

export type PaymentTransitionResult =
  | { accepted: true; changed: boolean; status: PaymentOrderStatus }
  | { accepted: false; reason: 'signature_not_verified' | 'provider_mismatch' | 'payment_id_mismatch' | 'amount_mismatch' | 'currency_mismatch' | 'invalid_transition' }

const transitions: Record<PaymentOrderStatus, readonly PaymentEventStatus[]> = {
  created: ['requires_action', 'processing', 'succeeded', 'failed', 'canceled'],
  requires_action: ['processing', 'succeeded', 'failed', 'canceled'],
  processing: ['succeeded', 'failed', 'canceled'],
  succeeded: ['partially_refunded', 'refunded', 'disputed'],
  failed: [],
  canceled: [],
  refunded: [],
  partially_refunded: ['refunded', 'disputed'],
  disputed: [],
}

/** Applies only an already-normalized, signed provider event to an order snapshot. */
export function evaluatePaymentTransition(order: PaymentOrderSnapshot, event: VerifiedPaymentEvent): PaymentTransitionResult {
  if (!event.signatureVerified) return { accepted: false, reason: 'signature_not_verified' }
  if (event.provider !== order.provider) return { accepted: false, reason: 'provider_mismatch' }
  if (!order.providerOrderId || event.providerPaymentId !== order.providerOrderId) return { accepted: false, reason: 'payment_id_mismatch' }
  if (event.amountMinor !== undefined && event.amountMinor !== order.amountMinor) return { accepted: false, reason: 'amount_mismatch' }
  if (event.currency !== undefined && event.currency.toUpperCase() !== order.currency.toUpperCase()) return { accepted: false, reason: 'currency_mismatch' }
  if (event.targetStatus === order.status) return { accepted: true, changed: false, status: order.status }
  if (!transitions[order.status].includes(event.targetStatus)) return { accepted: false, reason: 'invalid_transition' }
  return { accepted: true, changed: true, status: event.targetStatus }
}
