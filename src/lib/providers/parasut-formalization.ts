import { createHash } from 'node:crypto'
import type { PrismaClient } from '@prisma/client'
import { db } from '@/lib/db'

const BASE_URL = 'https://api.parasut.com/v4'
const E_INVOICES_PATH = '/e_invoices'
const E_ARCHIVES_PATH = '/e_archives'

export type ParasutEInvoiceScenario = 'basic' | 'commercial'
export type ParasutInternetPaymentType = 'KREDIKARTI/BANKAKARTI' | 'EFT/HAVALE' | 'KAPIDAODEME' | 'ODEMEARACISI'

export type ParasutFormalizationInput = {
  companyId: string
  salesInvoiceId: string
  documentType: 'e_invoice' | 'e_archive'
  eInvoiceScenario?: ParasutEInvoiceScenario
  eInvoiceAddress?: string
  internetSale?: {
    url: string
    paymentType: ParasutInternetPaymentType
    paymentPlatform?: string
    paymentDate?: string
  }
}

export type ParasutFormalizationRequest = {
  url: string
  method: 'POST'
  headers: { accept: string; authorization: string; 'content-type': string }
  body: string
}

export type ParasutFormalizationTransportResponse = {
  status: number
  json?: unknown
}

export type ParasutFormalizationTransport = {
  post(request: ParasutFormalizationRequest): Promise<ParasutFormalizationTransportResponse>
}

export type ParasutFormalizationStore = {
  claimDraftCreated(invoiceRecordId: string): Promise<{ claimed: true } | { claimed: false; state: string; providerJobId: string | null }>
  markFormalizationPending(invoiceRecordId: string, providerJobId: string, createdAt?: Date): Promise<void>
  markReconciliationRequired(invoiceRecordId: string): Promise<void>
  markProviderError(invoiceRecordId: string): Promise<void>
}

export type ParasutFormalizationExecutionInput = {
  workspaceId: string
  invoiceRecordId: string
  accessToken: string
  input: ParasutFormalizationInput
  expectedRequestFingerprint: string
}

export type ParasutFormalizationResult =
  | { status: 'formalization_pending'; providerJobId: string; duplicate: boolean }
  | { status: 'reconciliation_required'; reason: 'request_changed' | 'ambiguous_provider_result' | 'transport_timeout' | 'provider_conflict_without_job' }
  | { status: 'provider_error'; reason: 'not_claimable' | 'authentication' | 'validation' | 'rate_limited' | 'unavailable' | 'unexpected_status' }

function numericId(value: string): boolean {
  return /^\d+$/.test(value) && value !== '0'
}

function boundedText(value: string | undefined, field: string): string {
  const text = value?.trim() ?? ''
  if (!text || text.length > 256) throw new Error(`${field} is invalid`)
  return text
}

function assertDate(value: string | undefined): void {
  if (value !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('payment date is invalid')
}

function assertInternetSale(value: ParasutFormalizationInput['internetSale']): void {
  if (!value) return
  if (!/^https:\/\/[^\s]+$/i.test(value.url) || value.url.length > 2048) throw new Error('internet sale url is invalid')
  if (value.paymentType === 'ODEMEARACISI') boundedText(value.paymentPlatform, 'payment platform')
  assertDate(value.paymentDate)
}

function assertInput(input: ParasutFormalizationInput, accessToken: string): void {
  if (!numericId(input.companyId)) throw new Error('parasut company id is invalid')
  if (!numericId(input.salesInvoiceId)) throw new Error('parasut sales invoice id is invalid')
  if (!accessToken.trim()) throw new Error('parasut access token is required')
  if (input.documentType !== 'e_invoice' && input.documentType !== 'e_archive') throw new Error('document type is invalid')
  if (input.documentType === 'e_invoice') {
    if (input.eInvoiceScenario !== 'basic' && input.eInvoiceScenario !== 'commercial') throw new Error('e-invoice scenario is required')
    boundedText(input.eInvoiceAddress, 'e-invoice address')
  }
  assertInternetSale(input.internetSale)
}

function buildBody(input: ParasutFormalizationInput): Record<string, unknown> {
  if (input.documentType === 'e_invoice') {
    return {
      data: {
        type: 'e_invoices',
        attributes: { scenario: input.eInvoiceScenario, to: input.eInvoiceAddress?.trim() },
        relationships: { invoice: { data: { type: 'sales_invoices', id: input.salesInvoiceId } } },
      },
    }
  }

  const attributes = input.internetSale ? {
    internet_sale: {
      url: input.internetSale.url.trim(),
      payment_type: input.internetSale.paymentType,
      ...(input.internetSale.paymentPlatform ? { payment_platform: input.internetSale.paymentPlatform.trim() } : {}),
      ...(input.internetSale.paymentDate ? { payment_date: input.internetSale.paymentDate } : {}),
    },
  } : {}
  return {
    data: {
      type: 'e_archives',
      attributes,
      relationships: { sales_invoice: { data: { type: 'sales_invoices', id: input.salesInvoiceId } } },
    },
  }
}

/** Builds the official asynchronous e-Fatura/e-Arşiv request without persisting credentials. */
export function buildParasutFormalizationRequest(input: ParasutFormalizationInput, accessToken: string): ParasutFormalizationRequest {
  assertInput(input, accessToken)
  const path = input.documentType === 'e_invoice' ? E_INVOICES_PATH : E_ARCHIVES_PATH
  return {
    url: `${BASE_URL}/${input.companyId}${path}`,
    method: 'POST',
    headers: {
      accept: 'application/vnd.api+json',
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/vnd.api+json',
    },
    body: JSON.stringify(buildBody(input)),
  }
}

/** Computes the replay fence from the tenant-independent request contract. */
export function parasutFormalizationFingerprint(input: ParasutFormalizationInput): string {
  const body = buildBody(input)
  return createHash('sha256').update(JSON.stringify({ companyId: input.companyId, salesInvoiceId: input.salesInvoiceId, documentType: input.documentType, body })).digest('hex')
}

/** Accepts only a numeric JSON:API trackable job resource identifier. */
export function parseParasutTrackableJobId(value: unknown): string | null {
  if (!value || typeof value !== 'object' || !('data' in value)) return null
  const data = (value as { data?: unknown }).data
  if (!data || typeof data !== 'object' || !('type' in data) || !('id' in data)) return null
  const resource = data as { type?: unknown; id?: unknown }
  return resource.type === 'trackable_jobs' && typeof resource.id === 'string' && numericId(resource.id) ? resource.id : null
}

function providerErrorReason(status: number): Extract<ParasutFormalizationResult, { status: 'provider_error' }>['reason'] {
  if (status === 401 || status === 403) return 'authentication'
  if (status === 422) return 'validation'
  if (status === 429) return 'rate_limited'
  if (status >= 500) return 'unavailable'
  return 'unexpected_status'
}

/** Executes one formalization submission; final issuance is deliberately deferred to job polling. */
export async function executeParasutFormalization(
  input: ParasutFormalizationExecutionInput,
  store: ParasutFormalizationStore,
  transport: ParasutFormalizationTransport,
): Promise<ParasutFormalizationResult> {
  if (!input.workspaceId.trim()) throw new Error('parasut formalization workspace is required')
  if (parasutFormalizationFingerprint(input.input) !== input.expectedRequestFingerprint) return { status: 'reconciliation_required', reason: 'request_changed' }

  const request = buildParasutFormalizationRequest(input.input, input.accessToken)
  const claim = await store.claimDraftCreated(input.invoiceRecordId)
  if (!claim.claimed) {
    if (claim.state === 'formalization_pending' && claim.providerJobId) return { status: 'formalization_pending', providerJobId: claim.providerJobId, duplicate: true }
    return { status: 'provider_error', reason: 'not_claimable' }
  }

  let response: ParasutFormalizationTransportResponse
  try {
    response = await transport.post(request)
  } catch {
    await store.markReconciliationRequired(input.invoiceRecordId)
    return { status: 'reconciliation_required', reason: 'transport_timeout' }
  }

  if (response.status === 201) {
    const providerJobId = parseParasutTrackableJobId(response.json)
    if (providerJobId) {
      await store.markFormalizationPending(input.invoiceRecordId, providerJobId, new Date())
      return { status: 'formalization_pending', providerJobId, duplicate: false }
    }
    await store.markReconciliationRequired(input.invoiceRecordId)
    return { status: 'reconciliation_required', reason: 'ambiguous_provider_result' }
  }

  if (response.status === 409) {
    await store.markReconciliationRequired(input.invoiceRecordId)
    return { status: 'reconciliation_required', reason: 'provider_conflict_without_job' }
  }

  await store.markProviderError(input.invoiceRecordId)
  return { status: 'provider_error', reason: providerErrorReason(response.status) }
}

type InvoiceRecordFormalizationClient = Pick<PrismaClient, 'invoiceRecord'>
type InvoiceRecordFormalizationScope = { workspaceId: string; invoiceRecordId: string; provider: string }

function assertScope(scope: InvoiceRecordFormalizationScope): void {
  if (!scope.workspaceId || !scope.invoiceRecordId || scope.provider !== 'parasut') throw new Error('parasut formalization store scope is invalid')
}

/** Creates a workspace/provider-scoped durable state transition adapter. */
export function createParasutFormalizationStoreFromClient(client: InvoiceRecordFormalizationClient, scope: InvoiceRecordFormalizationScope): ParasutFormalizationStore {
  assertScope(scope)
  const where = { id: scope.invoiceRecordId, workspaceId: scope.workspaceId, provider: scope.provider }
  return {
    async claimDraftCreated(invoiceRecordId) {
      if (invoiceRecordId !== scope.invoiceRecordId) return { claimed: false, state: 'not_found', providerJobId: null }
      const claimed = await client.invoiceRecord.updateMany({ where: { ...where, state: 'provider_draft_created' }, data: { state: 'formalization_submitting' } })
      if (claimed.count === 1) return { claimed: true }
      const current = await client.invoiceRecord.findFirst({ where, select: { state: true, providerJobId: true } })
      return current ? { claimed: false, state: current.state, providerJobId: current.providerJobId } : { claimed: false, state: 'not_found', providerJobId: null }
    },
    async markFormalizationPending(invoiceRecordId, providerJobId, createdAt = new Date()) {
      const result = await client.invoiceRecord.updateMany({ where: { ...where, id: invoiceRecordId, state: 'formalization_submitting' }, data: { state: 'formalization_pending', providerJobId, providerJobCreatedAt: createdAt } })
      if (result.count !== 1) throw new Error('parasut formalization pending transition lost')
    },
    async markReconciliationRequired(invoiceRecordId) {
      const result = await client.invoiceRecord.updateMany({ where: { ...where, id: invoiceRecordId, state: 'formalization_submitting' }, data: { state: 'reconciliation_required' } })
      if (result.count !== 1) throw new Error('parasut formalization reconciliation transition lost')
    },
    async markProviderError(invoiceRecordId) {
      const result = await client.invoiceRecord.updateMany({ where: { ...where, id: invoiceRecordId, state: 'formalization_submitting' }, data: { state: 'provider_error' } })
      if (result.count !== 1) throw new Error('parasut formalization provider error transition lost')
    },
  }
}

export function createParasutFormalizationStore(scope: InvoiceRecordFormalizationScope): ParasutFormalizationStore {
  return createParasutFormalizationStoreFromClient(db, scope)
}
