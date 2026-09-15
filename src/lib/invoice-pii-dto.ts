import type { UserRole } from '@/lib/types'

export type InvoiceRequestRole = UserRole | 'accounting' | 'public'

type InvoiceAccess =
  | { allowed: true; exposure: 'full' }
  | { allowed: false; exposure: 'closed' }

export type InvoiceResponseRecord = {
  id: string
  workspaceId: string
  paymentOrderId: string
  provider: string
  documentType: string
  amountMinor: number
  currency: string
  state: string
  providerInvoiceId: string | null
  invoiceNumber: string | null
  invoiceUuid: string | null
  recipientSnapshot?: {
    recipientType: string
    legalNameEncrypted: string | null
    taxNumberEncrypted: string | null
    taxOfficeEncrypted: string | null
    identityNumberEncrypted: string | null
    emailEncrypted: string | null
    billingAddressEncrypted: string | null
    countryCode: string | null
  } | null
  lines: Array<{
    lineNumber: number
    description: string
    quantity: string
    lineTotalMinor: number
    currency: string
  }>
  documents: Array<{
    id: string
    state: string
    scanStatus: string
  }>
}

export type InvoiceResponse = {
  id: string
  paymentOrderId: string
  provider: string
  documentType: string
  amountMinor: number
  currency: string
  state: string
  providerInvoiceId: string | null
  invoiceNumber: string | null
  invoiceUuid: string | null
  recipient: {
    recipientType: string
    legalName: string | null
    taxNumber: string | null
    taxOffice: string | null
    identityNumber: string | null
    email: string | null
    billingAddress: string | null
    countryCode: string | null
  } | null
  lines: InvoiceResponseRecord['lines']
  documents: InvoiceResponseRecord['documents']
}

export type InvoiceRecipientResponse = {
  recipientType: string
  legalName: string | null
  taxNumber: string | null
  taxOffice: string | null
  identityNumber: string | null
  email: string | null
  billingAddress: string | null
  countryCode: string | null
}

/**
 * Invoice PII is a separately privileged surface. Unknown roles, viewers and
 * anonymous callers are closed rather than receiving a partial PII response.
 */
export function invoiceAccessForRole(role: unknown): InvoiceAccess {
  if (role === 'owner' || role === 'admin' || role === 'accounting') {
    return { allowed: true, exposure: 'full' }
  }
  return { allowed: false, exposure: 'closed' }
}

function decryptNullable(value: string | null, decrypt: (value: string) => string): string | null {
  return value === null ? null : decrypt(value)
}

/** Decrypts recipient PII only for the already authorized server boundary. */
export function toInvoiceRecipientResponse(
  snapshot: NonNullable<InvoiceResponseRecord['recipientSnapshot']> | null | undefined,
  decrypt: (value: string) => string,
): InvoiceRecipientResponse | null {
  if (!snapshot) return null
  return {
    recipientType: snapshot.recipientType,
    legalName: decryptNullable(snapshot.legalNameEncrypted, decrypt),
    taxNumber: decryptNullable(snapshot.taxNumberEncrypted, decrypt),
    taxOffice: decryptNullable(snapshot.taxOfficeEncrypted, decrypt),
    identityNumber: decryptNullable(snapshot.identityNumberEncrypted, decrypt),
    email: decryptNullable(snapshot.emailEncrypted, decrypt),
    billingAddress: decryptNullable(snapshot.billingAddressEncrypted, decrypt),
    countryCode: snapshot.countryCode,
  }
}

/**
 * Produces the authenticated invoice DTO and deliberately omits workspace
 * identifiers, encrypted envelopes and storage keys from the response.
 */
export function toInvoiceResponse(
  record: InvoiceResponseRecord,
  role: unknown,
  decrypt: (value: string) => string,
): InvoiceResponse {
  if (!invoiceAccessForRole(role).allowed) throw new Error('invoice_access_denied')

  return {
    id: record.id,
    paymentOrderId: record.paymentOrderId,
    provider: record.provider,
    documentType: record.documentType,
    amountMinor: record.amountMinor,
    currency: record.currency,
    state: record.state,
    providerInvoiceId: record.providerInvoiceId,
    invoiceNumber: record.invoiceNumber,
    invoiceUuid: record.invoiceUuid,
    recipient: toInvoiceRecipientResponse(record.recipientSnapshot, decrypt),
    lines: record.lines.map(line => ({
      lineNumber: line.lineNumber,
      description: line.description,
      quantity: line.quantity,
      lineTotalMinor: line.lineTotalMinor,
      currency: line.currency,
    })),
    documents: record.documents.map(document => ({
      id: document.id,
      state: document.state,
      scanStatus: document.scanStatus,
    })),
  }
}
