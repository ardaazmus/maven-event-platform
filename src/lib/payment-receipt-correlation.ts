import { isPublicPaymentKey } from '@/lib/payment-status-key'

type ReceiptCorrelationInput = {
  publicKey: unknown
  requestedSlug: unknown
  storedSlug: unknown
}

type ReceiptCorrelationResult =
  | { ok: true }
  | { ok: false; reason: 'receipt_invalid' | 'slug_invalid' | 'slug_mismatch' }

function isFormSlug(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/.test(value)
}

/** Confirms that an opaque receipt belongs to the callback form without exposing order data. */
export function correlatePublicPaymentReceipt(input: ReceiptCorrelationInput): ReceiptCorrelationResult {
  if (!isPublicPaymentKey(input.publicKey)) return { ok: false, reason: 'receipt_invalid' }
  if (!isFormSlug(input.requestedSlug) || !isFormSlug(input.storedSlug)) return { ok: false, reason: 'slug_invalid' }
  if (input.requestedSlug !== input.storedSlug) return { ok: false, reason: 'slug_mismatch' }
  return { ok: true }
}
