import { randomBytes } from 'node:crypto'

const publicPaymentKeyPattern = /^pk_[A-Za-z0-9_-]{32}$/

/** Creates an opaque public payment status key that is unrelated to internal database IDs. */
export function createPublicPaymentKey(): string {
  return `pk_${randomBytes(24).toString('base64url')}`
}

/** Validates a public payment status key before it is used for a status lookup. */
export function isPublicPaymentKey(value: unknown): value is string {
  return typeof value === 'string' && publicPaymentKeyPattern.test(value)
}

/** Builds the user-facing processing path without exposing a PaymentOrder identifier. */
export function buildPublicPaymentStatusPath(value: unknown): string | null {
  return isPublicPaymentKey(value) ? `/payment-status/${value}` : null
}

/** Builds the public polling API path without exposing an internal order ID. */
export function buildPublicPaymentStatusApiPath(value: unknown): string | null {
  return isPublicPaymentKey(value) ? `/api/public/payment-status/${value}` : null
}
