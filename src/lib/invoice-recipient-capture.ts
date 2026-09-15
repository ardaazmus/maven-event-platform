import type { InvoiceFormConfig } from '@/lib/invoice-form-config'
import { validateInvoiceRecipient, type InvoiceRecipientType } from '@/lib/invoice-recipient-validation'
import type { EncryptedInvoiceRecipientSnapshot } from '@/lib/payment-invoice-snapshot'

type CaptureInput = {
  config: InvoiceFormConfig
  values: Record<string, unknown>
  encrypt: (value: string) => string
}

type CaptureResult =
  | {
      ok: true
      validationStatus: 'valid' | 'review_required'
      recipient: EncryptedInvoiceRecipientSnapshot
    }
  | { ok: false; reason: 'mapping_missing' | 'recipient_invalid' | 'encryption_failed' }

function text(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized || null
}

function valueFor(values: Record<string, unknown>, key: string | undefined): string | null {
  return key ? text(values[key]) : null
}

/** Maps only explicitly configured submission fields and encrypts every stored recipient value. */
export function captureInvoiceRecipient(input: CaptureInput): CaptureResult {
  const { config } = input
  const fields = config.enabled ? config.fields : undefined
  if (!fields?.legalName) return { ok: false, reason: 'mapping_missing' }

  const raw = {
    recipientType: (config.recipientType || 'individual') as InvoiceRecipientType,
    legalName: valueFor(input.values, fields.legalName),
    countryCode: valueFor(input.values, fields.countryCode),
    email: valueFor(input.values, fields.email),
    taxNumber: valueFor(input.values, fields.taxNumber),
    identityNumber: valueFor(input.values, fields.identityNumber),
    taxOffice: valueFor(input.values, fields.taxOffice),
  }
  const validation = validateInvoiceRecipient(raw)
  if (validation.status === 'invalid') return { ok: false, reason: 'recipient_invalid' }

  try {
    const recipient: EncryptedInvoiceRecipientSnapshot = {
      recipientType: raw.recipientType,
      legalNameEncrypted: input.encrypt(raw.legalName!),
      countryCode: raw.countryCode,
      emailEncrypted: raw.email ? input.encrypt(raw.email) : null,
      taxNumberEncrypted: raw.taxNumber ? input.encrypt(raw.taxNumber) : null,
      identityNumberEncrypted: raw.identityNumber ? input.encrypt(raw.identityNumber) : null,
      taxOfficeEncrypted: raw.taxOffice ? input.encrypt(raw.taxOffice) : null,
      billingAddressEncrypted: valueFor(input.values, fields.billingAddress)
        ? input.encrypt(valueFor(input.values, fields.billingAddress)!)
        : null,
      source: 'public_submission',
      noticeVersion: String(config.version),
    }
    return { ok: true, validationStatus: validation.status, recipient }
  } catch {
    return { ok: false, reason: 'encryption_failed' }
  }
}
