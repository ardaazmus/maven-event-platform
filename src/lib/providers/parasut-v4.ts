export const PARASUT_API_V4_BASE = 'https://api.parasut.com/v4'

export type ParasutFailure = {
  code: string
  kind: 'authentication' | 'validation' | 'rate_limited' | 'unavailable' | 'not_ready' | 'unknown'
  providerStatus: number | null
  retryable: boolean
}

export type ParasutResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ParasutFailure }

export type ParasutContactCommand = {
  companyId: string
  taxNumber?: string
  email?: string
  legalName?: string
}

export type ParasutContactRef = {
  providerContactId: string
  matchStrategy: 'exact_tax_number' | 'exact_email' | 'exact_external_id' | 'candidate_review_required'
  requiresReview: boolean
}

export type ParasutProductCommand = {
  companyId: string
  productCode: string
  name: string
  unit: string
  unitPriceMinor: number
  currency: string
}

export type ParasutProductRef = {
  providerProductId: string
  productCode: string
  requiresReview: boolean
}

export type ParasutSalesInvoiceLine = {
  description: string
  quantity: string
  unitPriceMinor: number
  taxRateBps: number
  lineTotalMinor: number
  currency: string
}

export type ParasutSalesInvoiceCommand = {
  companyId: string
  idempotencyKey: string
  requestHash: string
  contact: ParasutContactRef
  details: readonly ParasutSalesInvoiceLine[]
  currency: string
  totalMinor: number
}

export type ParasutDraftInvoice = {
  providerInvoiceId: string
  status: 'provider_draft_created'
}

export type ParasutEInvoiceInboxCommand = {
  companyId: string
  taxNumber: string
}

export type ParasutEInvoiceInbox = {
  taxNumber: string
  found: boolean
  checkedAt: string
}

export type ParasutFormalizationCommand = {
  companyId: string
  providerInvoiceId: string
  requestHash: string
}

export type ParasutFormalizationAccepted = {
  providerJobId: string
  status: 'formalization_pending'
}

export type ParasutTrackableJob = {
  providerJobId: string
  status: 'pending' | 'running' | 'error' | 'done'
  providerStatus: string | null
  errorCode: string | null
}

export type ParasutPdfCommand = {
  companyId: string
  providerDocumentId: string
}

export type ParasutPdfDownload =
  | { status: 'not_ready'; providerStatus: 204 }
  | { status: 'document_ready'; providerDocumentId: string; contentType: 'application/pdf'; pdfBytes: Uint8Array; sha256: string }

/**
 * Provider boundary for Paraşüt v4. Implementations return normalized domain
 * results only; credentials, headers, raw payloads and temporary links remain
 * inside the server-side adapter implementation.
 */
export interface ParasutV4Adapter {
  findOrCreateContact(input: ParasutContactCommand): Promise<ParasutResult<ParasutContactRef>>
  findOrCreateProduct(input: ParasutProductCommand): Promise<ParasutResult<ParasutProductRef>>
  createSalesInvoice(input: ParasutSalesInvoiceCommand): Promise<ParasutResult<ParasutDraftInvoice>>
  lookupEInvoiceInbox(input: ParasutEInvoiceInboxCommand): Promise<ParasutResult<ParasutEInvoiceInbox>>
  formalizeEInvoice(input: ParasutFormalizationCommand): Promise<ParasutResult<ParasutFormalizationAccepted>>
  formalizeEArchive(input: ParasutFormalizationCommand): Promise<ParasutResult<ParasutFormalizationAccepted>>
  getTrackableJob(input: { companyId: string; providerJobId: string }): Promise<ParasutResult<ParasutTrackableJob>>
  downloadInvoicePdf(input: ParasutPdfCommand): Promise<ParasutResult<ParasutPdfDownload>>
}
