import { attachProviderCheckout } from '@/lib/payment-order-checkout-persistence'

type RetrieveHandoffTransaction = Parameters<typeof attachProviderCheckout>[0]

type RetrieveHandoffResult =
  | { ok: true; queued: boolean; status: 'processing' }
  | { ok: false; reason: 'input_invalid' | 'order_not_found' | 'provider_mismatch' | 'provider_reference_conflict' | 'order_not_ready' }

function isInternalId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,200}$/.test(value)
}

function isIyzicoReference(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{8,255}$/.test(value)
}

/** Queues an iyzico token for later server-side retrieval without trusting callback success. */
export async function queueIyzicoPaymentRetrieve(
  tx: RetrieveHandoffTransaction,
  input: { paymentOrderId: unknown; providerReference: unknown },
): Promise<RetrieveHandoffResult> {
  if (!isInternalId(input.paymentOrderId) || !isIyzicoReference(input.providerReference)) return { ok: false, reason: 'input_invalid' }
  const attached = await attachProviderCheckout(tx, {
    paymentOrderId: input.paymentOrderId,
    provider: 'iyzico',
    providerReference: input.providerReference,
    status: 'processing',
  })
  if (!attached.ok) return attached
  return { ok: true, queued: !attached.reused, status: 'processing' }
}
