export const INVOICE_DELIVERY_MAX_ATTEMPTS = 5

type InvoiceDeliveryFailureKind = 'retryable' | 'permanent'

export type InvoiceDeliveryFailureDecision = {
  code: string
  failureKind: InvoiceDeliveryFailureKind
  terminal: boolean
}

const permanentFailureCodes = new Set([
  'dispatch_payload_invalid',
  'provider_rejected',
  'provider_invalid',
  'email_queued_email_payload_invalid',
  'email_queued_email_recipient_invalid',
])

function safeFailureCode(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-z0-9_]{1,80}$/.test(value)) return 'invoice_delivery_failed'
  return value
}

/** Classifies invoice delivery failures without exposing provider details or retrying unsafe payloads forever. */
export function classifyInvoiceDeliveryFailure(input: { code: string; attemptCount: number }): InvoiceDeliveryFailureDecision {
  if (!Number.isSafeInteger(input.attemptCount) || input.attemptCount < 1) throw new Error('attempt count invalid')
  const code = safeFailureCode(input.code)
  const baseKind: InvoiceDeliveryFailureKind = permanentFailureCodes.has(code) ? 'permanent' : 'retryable'
  const terminal = baseKind === 'permanent' || input.attemptCount >= INVOICE_DELIVERY_MAX_ATTEMPTS
  return { code, failureKind: terminal ? 'permanent' : 'retryable', terminal }
}
