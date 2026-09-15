import type { CheckoutActionStatus } from '@/lib/payment-checkout-contract'
import type { PaymentProvider } from '@/lib/payment-provider-contract'

type CheckoutOrder = {
  id: string
  provider: string
  providerOrderId: string | null
  status: string
}

type CheckoutTransaction = {
  paymentOrder: {
    findUnique(args: { where: { id: string } }): Promise<CheckoutOrder | null>
    update(args: { where: { id: string }; data: { providerOrderId: string; status: 'requires_action' | 'processing' } }): Promise<CheckoutOrder>
  }
  paymentAttempt: {
    findFirst(args: { where: { paymentOrderId: string; provider: PaymentProvider; providerPaymentId: string } }): Promise<unknown | null>
    create(args: { data: { paymentOrderId: string; provider: PaymentProvider; providerPaymentId: string; status: 'requires_action' | 'processing' } }): Promise<unknown>
  }
}

type AttachCheckoutResult =
  | { ok: true; reused: boolean; status: 'requires_action' | 'processing'; providerReference: string }
  | { ok: false; reason: 'order_not_found' | 'provider_mismatch' | 'provider_reference_conflict' | 'order_not_ready' }

/** Atomically binds a hosted checkout reference to an internal order and creates one attempt. */
export async function attachProviderCheckout(
  tx: CheckoutTransaction,
  input: { paymentOrderId: string; provider: PaymentProvider; providerReference: string; status: CheckoutActionStatus },
): Promise<AttachCheckoutResult> {
  const order = await tx.paymentOrder.findUnique({ where: { id: input.paymentOrderId } })
  if (!order) return { ok: false, reason: 'order_not_found' }
  if (order.provider !== input.provider) return { ok: false, reason: 'provider_mismatch' }
  if (order.providerOrderId && order.providerOrderId !== input.providerReference) return { ok: false, reason: 'provider_reference_conflict' }
  const status = input.status === 'processing' ? 'processing' : 'requires_action'
  if (order.providerOrderId === input.providerReference) return { ok: true, reused: true, status, providerReference: input.providerReference }
  if (order.status !== 'created') return { ok: false, reason: 'order_not_ready' }

  await tx.paymentOrder.update({ where: { id: order.id }, data: { providerOrderId: input.providerReference, status } })
  const existingAttempt = await tx.paymentAttempt.findFirst({ where: { paymentOrderId: order.id, provider: input.provider, providerPaymentId: input.providerReference } })
  if (!existingAttempt) {
    await tx.paymentAttempt.create({ data: { paymentOrderId: order.id, provider: input.provider, providerPaymentId: input.providerReference, status } })
  }
  return { ok: true, reused: false, status, providerReference: input.providerReference }
}
