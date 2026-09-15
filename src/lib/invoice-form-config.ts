export const INVOICE_FORM_CONFIG_VERSION = 1 as const

export type InvoiceRecipientCollection = 'optional' | 'required'
export type InvoiceRecipientType = 'individual' | 'company' | 'foreign'

export interface InvoiceRecipientFieldMapping {
  legalName?: string
  countryCode?: string
  email?: string
  taxNumber?: string
  identityNumber?: string
  taxOffice?: string
  billingAddress?: string
}

export interface InvoiceFormConfig {
  version: typeof INVOICE_FORM_CONFIG_VERSION
  enabled: boolean
  recipientCollection: InvoiceRecipientCollection
  consentRequired: boolean
  recipientType?: InvoiceRecipientType
  fields?: InvoiceRecipientFieldMapping
}

const DEFAULT_CONFIG: InvoiceFormConfig = {
  version: INVOICE_FORM_CONFIG_VERSION,
  enabled: false,
  recipientCollection: 'optional',
  consentRequired: false,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function fieldKey(value: unknown): string | null {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,120}$/.test(value) ? value : null
}

function normalizeFieldMapping(value: unknown): InvoiceRecipientFieldMapping | undefined {
  if (!isRecord(value)) return undefined
  const fields: InvoiceRecipientFieldMapping = {}
  for (const name of ['legalName', 'countryCode', 'email', 'taxNumber', 'identityNumber', 'taxOffice', 'billingAddress'] as const) {
    const key = fieldKey(value[name])
    if (key) fields[name] = key
  }
  return Object.keys(fields).length > 0 ? fields : undefined
}

/** Normalizes only the versioned, form-level invoice behavior contract. */
export function normalizeInvoiceFormConfig(value: unknown): InvoiceFormConfig {
  if (!isRecord(value) || value.version !== INVOICE_FORM_CONFIG_VERSION) return { ...DEFAULT_CONFIG }

  const enabled = value.enabled === true
  const recipientCollection = value.recipientCollection === 'required' ? 'required' : 'optional'
  const consentRequired = enabled && value.consentRequired === true

  const config: InvoiceFormConfig = { version: INVOICE_FORM_CONFIG_VERSION, enabled, recipientCollection, consentRequired }
  if (value.recipientType === 'individual' || value.recipientType === 'company' || value.recipientType === 'foreign') config.recipientType = value.recipientType
  const fields = normalizeFieldMapping(value.fields)
  if (fields) config.fields = fields
  return config
}

/** Extracts the invoice contract from a complete form settings object. */
export function getInvoiceFormConfig(settings: unknown): InvoiceFormConfig {
  return normalizeInvoiceFormConfig(isRecord(settings) ? settings.invoice : undefined)
}

/** Returns the only invoice settings allowed in a published public snapshot. */
export function sanitizePublicInvoiceFormConfig(settings: unknown): InvoiceFormConfig {
  const config = getInvoiceFormConfig(settings)
  return config.enabled ? config : { ...DEFAULT_CONFIG }
}
