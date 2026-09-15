const recipientEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type PaymentInvoicePreparationInput = {
  paymentStatus: string
  recipientEmail: string
  formTitle: string
  registrationMethod?: string | null
  feeStage?: string | null
  amountMinor: number
  currency: string
  taxRateBps?: number | null
}

type PaymentInvoicePreparationResult =
  | {
      ok: true
      recipientEmail: string
      email: {
        eventKind: 'invoice_preparation'
        messageClass: 'transactional'
        subject: 'Faturanız hazırlanıyor'
        textBody: string
      }
      invoiceSnapshot: {
        formTitle: string
        registrationMethod: string | null
        feeStage: string | null
        amountMinor: number
        currency: string
        taxRateBps: number | null
      }
    }
  | { ok: false; reason: 'payment_not_succeeded' | 'recipient_invalid' | 'snapshot_invalid' }

function safeText(value: string | null | undefined, maxLength: number): string | null {
  if (value == null) return null
  const text = value.trim()
  return text && text.length <= maxLength && !/[\r\n]/.test(text) ? text : null
}

/** Builds a server-owned, non-delivery intent after a verified successful payment. */
export function buildPaymentInvoicePreparationIntent(
  input: PaymentInvoicePreparationInput,
): PaymentInvoicePreparationResult {
  if (input.paymentStatus !== 'succeeded') return { ok: false, reason: 'payment_not_succeeded' }

  const recipientEmail = input.recipientEmail.trim().toLowerCase()
  const formTitle = safeText(input.formTitle, 200)
  const registrationMethod = safeText(input.registrationMethod, 120)
  const feeStage = safeText(input.feeStage, 120)
  const currency = input.currency.trim().toUpperCase()
  const taxRateBps = input.taxRateBps == null ? null : input.taxRateBps
  if (!recipientEmailPattern.test(recipientEmail) || recipientEmail.length > 320) return { ok: false, reason: 'recipient_invalid' }
  if (!formTitle || !Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0 || !/^[A-Z]{3}$/.test(currency)) {
    return { ok: false, reason: 'snapshot_invalid' }
  }
  if (input.registrationMethod != null && registrationMethod == null) return { ok: false, reason: 'snapshot_invalid' }
  if (input.feeStage != null && feeStage == null) return { ok: false, reason: 'snapshot_invalid' }
  if (taxRateBps != null && (!Number.isSafeInteger(taxRateBps) || taxRateBps < 0 || taxRateBps > 10000)) return { ok: false, reason: 'snapshot_invalid' }

  return {
    ok: true,
    recipientEmail,
    email: {
      eventKind: 'invoice_preparation',
      messageClass: 'transactional',
      subject: 'Faturanız hazırlanıyor',
      textBody: `${formTitle} için ödemeniz alındı. Faturanız hazırlanıyor.`,
    },
    invoiceSnapshot: { formTitle, registrationMethod, feeStage, amountMinor: input.amountMinor, currency, taxRateBps },
  }
}
