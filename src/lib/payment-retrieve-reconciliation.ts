import { evaluatePaymentTransition, type PaymentOrderSnapshot, type PaymentOrderStatus, type PaymentTransitionResult } from '@/lib/payment-state'
import type { NormalizedProviderRetrieveResult } from '@/lib/payment-retrieve-contract'

type RetrieveFailure = Extract<NormalizedProviderRetrieveResult, { ok: false }>

type ReconciliationResult =
  | { ok: true; changed: boolean; status: PaymentOrderStatus }
  | { ok: false; reason: 'retrieve_failed'; category: RetrieveFailure['category']; code: string }
  | { ok: false; reason: Exclude<Extract<PaymentTransitionResult, { accepted: false }>['reason'], never> }

/** Decides a retrieve-driven transition without writing payment state. */
export function decideRetrievedPaymentTransition(
  order: PaymentOrderSnapshot,
  retrieved: NormalizedProviderRetrieveResult | { ok: false; category: 'configuration'; code: 'provider_invalid' },
): ReconciliationResult {
  if (!retrieved.ok) {
    return { ok: false, reason: 'retrieve_failed', category: retrieved.category, code: retrieved.code }
  }

  const transition = evaluatePaymentTransition(order, {
    provider: retrieved.provider,
    providerPaymentId: retrieved.providerPaymentId,
    signatureVerified: true,
    targetStatus: retrieved.status,
    amountMinor: retrieved.amountMinor,
    currency: retrieved.currency,
  })
  if (!transition.accepted) return { ok: false, reason: transition.reason }
  return { ok: true, changed: transition.changed, status: transition.status }
}
