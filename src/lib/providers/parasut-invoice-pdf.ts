import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { PrismaClient } from '@prisma/client'
import { db } from '@/lib/db'
import { INVOICE_DOCUMENT_MAX_SIZE, validateInvoiceDocumentUpload } from '@/lib/invoice-document-validation'
import { invoiceDocumentStoragePath, INVOICE_DOCUMENT_ROOT } from '@/lib/invoice-document-storage'

const BASE_URL = 'https://api.parasut.com/v4'
const SALES_INVOICES_PATH = '/sales_invoices'

export type ParasutActiveDocumentType = 'e_invoices' | 'e_archives'
export type ParasutActiveDocument = { providerDocumentId: string; documentType: ParasutActiveDocumentType }
export type ParasutPdfDescriptor = { providerDocumentId: string; documentType: ParasutActiveDocumentType; url: string; expiresAt: Date }

export type ParasutInvoiceReadRequest = {
  url: string
  method: 'GET'
  headers: { accept: string; authorization: string }
}

export type ParasutInvoicePdfTransportResponse = {
  status: number
  json?: unknown
}

export type ParasutInvoicePdfDownloadResponse = {
  status: number
  contentType?: string
  bytes?: Uint8Array
}

export type ParasutInvoicePdfTransport = {
  get(request: ParasutInvoiceReadRequest): Promise<ParasutInvoicePdfTransportResponse>
  download(url: string): Promise<ParasutInvoicePdfDownloadResponse>
}

export type ParasutInvoicePdfStore = {
  savePdf(input: { invoiceRecordId: string; providerInvoiceId: string; providerDocumentId: string; bytes: Uint8Array; sha256: string }): Promise<{ documentId: string; duplicate: boolean }>
}

export type ParasutInvoicePdfInput = {
  workspaceId: string
  invoiceRecordId: string
  companyId: string
  salesInvoiceId: string
  accessToken: string
  now?: Date
}

export type ParasutInvoicePdfResult =
  | { status: 'document_stored'; documentId: string; providerDocumentId: string; sha256: string; duplicate: boolean }
  | { status: 'not_ready'; reason: 'active_document_missing' | 'pdf_not_ready' }
  | { status: 'reconciliation_required'; reason: 'ambiguous_active_document' | 'ambiguous_pdf_descriptor' | 'expired_provider_url' | 'invalid_pdf' }
  | { status: 'provider_error'; reason: 'authentication' | 'validation' | 'rate_limited' | 'unavailable' | 'not_found' | 'unexpected_status' }

function numericId(value: string): boolean {
  return /^\d+$/.test(value) && value !== '0'
}

function assertInput(input: ParasutInvoicePdfInput): void {
  if (!input.workspaceId.trim()) throw new Error('parasut invoice pdf workspace is required')
  if (!numericId(input.companyId)) throw new Error('parasut company id is invalid')
  if (!numericId(input.salesInvoiceId)) throw new Error('parasut sales invoice id is invalid')
  if (!input.accessToken.trim()) throw new Error('parasut access token is required')
}

/** Requests the sales invoice with only the official active_e_document include. */
export function buildParasutActiveDocumentRequest(companyId: string, salesInvoiceId: string, accessToken: string): ParasutInvoiceReadRequest {
  if (!numericId(companyId)) throw new Error('parasut company id is invalid')
  if (!numericId(salesInvoiceId)) throw new Error('parasut sales invoice id is invalid')
  if (!accessToken.trim()) throw new Error('parasut access token is required')
  return { url: `${BASE_URL}/${companyId}${SALES_INVOICES_PATH}/${salesInvoiceId}?include=active_e_document`, method: 'GET', headers: { accept: 'application/vnd.api+json', authorization: `Bearer ${accessToken}` } }
}

/** Builds the provider PDF request after the active document type/id is verified. */
export function buildParasutPdfRequest(companyId: string, document: ParasutActiveDocument, accessToken: string): ParasutInvoiceReadRequest {
  if (!numericId(companyId)) throw new Error('parasut company id is invalid')
  if (!numericId(document.providerDocumentId)) throw new Error('parasut provider document id is invalid')
  if (document.documentType !== 'e_invoices' && document.documentType !== 'e_archives') throw new Error('parasut document type is invalid')
  if (!accessToken.trim()) throw new Error('parasut access token is required')
  return { url: `${BASE_URL}/${companyId}/${document.documentType}/${document.providerDocumentId}/pdf`, method: 'GET', headers: { accept: 'application/vnd.api+json', authorization: `Bearer ${accessToken}` } }
}

/** Parses the allowlisted active_e_document relationship from a sales invoice response. */
export function parseParasutActiveDocument(value: unknown): ParasutActiveDocument | null {
  if (!value || typeof value !== 'object' || !('data' in value)) return null
  const data = (value as { data?: unknown }).data
  if (!data || typeof data !== 'object' || !('relationships' in data)) return null
  const relationships = (data as { relationships?: unknown }).relationships
  if (!relationships || typeof relationships !== 'object' || !('active_e_document' in relationships)) return null
  const relation = (relationships as { active_e_document?: unknown }).active_e_document
  if (!relation || typeof relation !== 'object' || !('data' in relation)) return null
  const document = (relation as { data?: unknown }).data
  if (!document || typeof document !== 'object' || !('type' in document) || !('id' in document)) return null
  const resource = document as { type?: unknown; id?: unknown }
  return (resource.type === 'e_invoices' || resource.type === 'e_archives') && typeof resource.id === 'string' && numericId(resource.id) ? { providerDocumentId: resource.id, documentType: resource.type } : null
}

/** Parses a provider PDF descriptor but never returns it from the application boundary. */
export function parseParasutPdfDescriptor(value: unknown): ParasutPdfDescriptor | null {
  if (!value || typeof value !== 'object' || !('data' in value)) return null
  const data = (value as { data?: unknown }).data
  if (!data || typeof data !== 'object' || !('type' in data) || !('id' in data) || !('attributes' in data)) return null
  const resource = data as { type?: unknown; id?: unknown; attributes?: unknown }
  if (resource.type !== 'e_document_pdfs' || typeof resource.id !== 'string' || !numericId(resource.id) || !resource.attributes || typeof resource.attributes !== 'object') return null
  const attributes = resource.attributes as { url?: unknown; expires_at?: unknown }
  if (typeof attributes.url !== 'string' || !/^https:\/\/[^\s]+$/i.test(attributes.url) || attributes.url.length > 4096 || typeof attributes.expires_at !== 'string') return null
  const expiresAt = new Date(attributes.expires_at)
  return Number.isNaN(expiresAt.getTime()) ? null : { providerDocumentId: resource.id, documentType: 'e_invoices', url: attributes.url, expiresAt }
}

function providerErrorReason(status: number): Extract<ParasutInvoicePdfResult, { status: 'provider_error' }>['reason'] {
  if (status === 401 || status === 403) return 'authentication'
  if (status === 404) return 'not_found'
  if (status === 422) return 'validation'
  if (status === 429) return 'rate_limited'
  if (status >= 500) return 'unavailable'
  return 'unexpected_status'
}

function contentType(value: string | undefined): string {
  return value?.split(';', 1)[0]?.trim().toLowerCase() ?? ''
}

/** Resolves active e-document, downloads provider PDF server-side and stores only private bytes. */
export async function executeParasutInvoicePdfDownload(input: ParasutInvoicePdfInput, store: ParasutInvoicePdfStore, transport: ParasutInvoicePdfTransport): Promise<ParasutInvoicePdfResult> {
  assertInput(input)
  const now = input.now ?? new Date()
  if (Number.isNaN(now.getTime())) throw new Error('invoice pdf time is invalid')

  let activeResponse: ParasutInvoicePdfTransportResponse
  try {
    activeResponse = await transport.get(buildParasutActiveDocumentRequest(input.companyId, input.salesInvoiceId, input.accessToken))
  } catch {
    return { status: 'provider_error', reason: 'unavailable' }
  }
  if (activeResponse.status !== 200) return { status: 'provider_error', reason: providerErrorReason(activeResponse.status) }
  const activeDocument = parseParasutActiveDocument(activeResponse.json)
  if (!activeDocument) return { status: 'not_ready', reason: 'active_document_missing' }

  let pdfResponse: ParasutInvoicePdfTransportResponse
  try {
    pdfResponse = await transport.get(buildParasutPdfRequest(input.companyId, activeDocument, input.accessToken))
  } catch {
    return { status: 'provider_error', reason: 'unavailable' }
  }
  if (pdfResponse.status === 204) return { status: 'not_ready', reason: 'pdf_not_ready' }
  if (pdfResponse.status !== 200) return { status: 'provider_error', reason: providerErrorReason(pdfResponse.status) }
  const descriptor = parseParasutPdfDescriptor({ data: { ...((pdfResponse.json as { data?: object })?.data ?? {}), type: 'e_document_pdfs' } })
  if (!descriptor) return { status: 'reconciliation_required', reason: 'ambiguous_pdf_descriptor' }
  if (descriptor.providerDocumentId !== activeDocument.providerDocumentId || descriptor.expiresAt <= now) return { status: 'reconciliation_required', reason: descriptor.expiresAt <= now ? 'expired_provider_url' : 'ambiguous_pdf_descriptor' }

  let downloaded: ParasutInvoicePdfDownloadResponse
  try {
    downloaded = await transport.download(descriptor.url)
  } catch {
    return { status: 'provider_error', reason: 'unavailable' }
  }
  if (downloaded.status !== 200) return { status: 'provider_error', reason: providerErrorReason(downloaded.status) }
  if (contentType(downloaded.contentType) !== 'application/pdf' || !(downloaded.bytes instanceof Uint8Array) || downloaded.bytes.byteLength > INVOICE_DOCUMENT_MAX_SIZE) return { status: 'reconciliation_required', reason: 'invalid_pdf' }
  const validation = validateInvoiceDocumentUpload({ filename: `${input.salesInvoiceId}.pdf`, mime: 'application/pdf', size: downloaded.bytes.byteLength, bytes: downloaded.bytes })
  if (!validation.ok) return { status: 'reconciliation_required', reason: 'invalid_pdf' }
  const stored = await store.savePdf({ invoiceRecordId: input.invoiceRecordId, providerInvoiceId: input.salesInvoiceId, providerDocumentId: activeDocument.providerDocumentId, bytes: downloaded.bytes, sha256: validation.sha256 })
  return { status: 'document_stored', documentId: stored.documentId, providerDocumentId: activeDocument.providerDocumentId, sha256: validation.sha256, duplicate: stored.duplicate }
}

type InvoiceDocumentPdfClient = Pick<PrismaClient, 'invoiceDocument' | 'invoiceRecord' | '$transaction' | 'auditLog'>
type InvoiceDocumentPdfScope = { workspaceId: string; invoiceRecordId: string; provider: string }

function assertScope(scope: InvoiceDocumentPdfScope): void {
  if (!scope.workspaceId || !scope.invoiceRecordId || scope.provider !== 'parasut') throw new Error('parasut invoice pdf store scope is invalid')
}

/** Persists a provider PDF in private quarantine storage; AV/document-ready remains a later gate. */
export function createParasutInvoicePdfStoreFromClient(client: InvoiceDocumentPdfClient, scope: InvoiceDocumentPdfScope): ParasutInvoicePdfStore {
  assertScope(scope)
  return {
    async savePdf(input) {
      if (input.invoiceRecordId !== scope.invoiceRecordId || !numericId(input.providerInvoiceId) || !numericId(input.providerDocumentId)) throw new Error('parasut invoice pdf store input is invalid')
      const invoice = await client.invoiceRecord.findFirst({ where: { id: scope.invoiceRecordId, workspaceId: scope.workspaceId, provider: scope.provider, providerInvoiceId: input.providerInvoiceId }, select: { id: true } })
      if (!invoice) throw new Error('parasut invoice pdf store scope mismatch')
      const duplicateWhere = { invoiceRecordId: scope.invoiceRecordId, artifactKind: 'pdf', sha256: input.sha256 }
      const existing = await client.invoiceDocument.findFirst({ where: duplicateWhere, select: { id: true } })
      if (existing) return { documentId: existing.id, duplicate: true }
      const documentId = randomUUID()
      const storageKey = invoiceDocumentStoragePath(scope.workspaceId, scope.invoiceRecordId, documentId, 'pdf')
      const storageRoot = path.resolve(process.cwd(), INVOICE_DOCUMENT_ROOT)
      const fullPath = path.resolve(process.cwd(), storageKey)
      if (fullPath !== storageRoot && !fullPath.startsWith(`${storageRoot}${path.sep}`)) throw new Error('unsafe invoice pdf path')
      await mkdir(path.dirname(fullPath), { recursive: true })
      await writeFile(fullPath, input.bytes, { flag: 'wx' })
      try {
        const document = await client.$transaction(async tx => {
          const record = await tx.invoiceDocument.create({ data: { id: documentId, invoiceRecordId: scope.invoiceRecordId, artifactKind: 'pdf', storageKey, mime: 'application/pdf', size: input.bytes.byteLength, sha256: input.sha256, scanStatus: 'pending', visibility: 'private', state: 'quarantined' }, select: { id: true } })
          await tx.auditLog.create({ data: { workspaceId: scope.workspaceId, actorId: null, action: 'invoice.document.provider_import', resourceType: 'invoice_document', resourceId: documentId, beforeJson: null, afterJson: JSON.stringify({ invoiceRecordId: scope.invoiceRecordId, providerDocumentId: input.providerDocumentId, state: 'quarantined', scanStatus: 'pending' }) } })
          return record
        })
        return { documentId: document.id, duplicate: false }
      } catch (error) {
        await unlink(fullPath).catch(() => undefined)
        if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
          const duplicate = await client.invoiceDocument.findFirst({ where: duplicateWhere, select: { id: true } })
          if (duplicate) return { documentId: duplicate.id, duplicate: true }
        }
        throw error
      }
    },
  }
}

export function createParasutInvoicePdfStore(scope: InvoiceDocumentPdfScope): ParasutInvoicePdfStore {
  return createParasutInvoicePdfStoreFromClient(db, scope)
}
