import type { PrismaClient } from '@prisma/client'
import { db } from '@/lib/db'
import type { ParasutSalesInvoicePayloadResult } from '@/lib/providers/parasut-v4-mappers'

const SALES_INVOICES_PATH = '/sales_invoices'

export type ParasutSalesInvoiceCreateRequest = {
  url: string
  method: 'POST'
  headers: { accept: string; authorization: string; 'content-type': string }
  body: string
}

export type ParasutSalesInvoiceCreateTransportResponse = {
  status: number
  json?: unknown
}

export type ParasutSalesInvoiceCreateTransport = {
  post(request: ParasutSalesInvoiceCreateRequest): Promise<ParasutSalesInvoiceCreateTransportResponse>
  get?(request: ParasutSalesInvoiceLookupRequest): Promise<ParasutSalesInvoiceCreateTransportResponse>
}

export type ParasutSalesInvoiceLookupRequest = {
  url: string
  method: 'GET'
  headers: { accept: string; authorization: string }
}

export type ParasutSalesInvoiceCreateStore = {
  claimQueued(invoiceRecordId: string): Promise<{ claimed: true } | { claimed: false; state: string; providerInvoiceId: string | null }>
  markDraftCreated(invoiceRecordId: string, providerInvoiceId: string): Promise<void>
  markReconciliationRequired(invoiceRecordId: string): Promise<void>
  markProviderError(invoiceRecordId: string): Promise<void>
}

export type ParasutSalesInvoiceCreateInput = {
  workspaceId: string
  invoiceRecordId: string
  companyId: string
  accessToken: string
  mappedPayload: Extract<ParasutSalesInvoicePayloadResult, { ok: true }>
  expectedRequestFingerprint: string
}

export type ParasutSalesInvoiceCreateResult =
  | { status: 'provider_draft_created'; providerInvoiceId: string; duplicate: boolean }
  | { status: 'reconciliation_required'; reason: 'request_changed' | 'ambiguous_provider_result' | 'transport_timeout' | 'provider_conflict_without_id' | 'reconciliation_lookup_failed' }
  | { status: 'provider_error'; reason: 'not_claimable' | 'authentication' | 'validation' | 'rate_limited' | 'unavailable' | 'unknown' }

function numericId(value: string): boolean {
  return /^\d+$/.test(value) && value !== '0'
}

function assertRequestInput(companyId: string, accessToken: string): void {
  if (!numericId(companyId)) throw new Error('parasut company id is invalid')
  if (!accessToken.trim()) throw new Error('parasut access token is required')
}

/** Builds the transient provider request; credentials and body never enter durable records. */
export function buildParasutSalesInvoiceCreateRequest(
  companyId: string,
  accessToken: string,
  mappedPayload: Extract<ParasutSalesInvoicePayloadResult, { ok: true }>,
): ParasutSalesInvoiceCreateRequest {
  assertRequestInput(companyId, accessToken)
  if (mappedPayload.method !== 'POST' || !mappedPayload.url.endsWith('/{{company_id}}/sales_invoices')) throw new Error('parasut sales invoice payload contract is invalid')

  const url = mappedPayload.url.replace('/{{company_id}}/sales_invoices', `/${companyId}${SALES_INVOICES_PATH}`)
  return {
    url,
    method: 'POST',
    headers: {
      accept: 'application/vnd.api+json',
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/vnd.api+json',
    },
    body: JSON.stringify(mappedPayload.payload),
  }
}

/** Builds the deterministic read-after-uncertain-result query when invoice_id was supplied. */
export function buildParasutSalesInvoiceLookupRequest(
  companyId: string,
  accessToken: string,
  mappedPayload: Extract<ParasutSalesInvoicePayloadResult, { ok: true }>,
): ParasutSalesInvoiceLookupRequest | null {
  assertRequestInput(companyId, accessToken)
  const attributes = mappedPayload.payload.data
  if (!attributes || typeof attributes !== 'object' || !('attributes' in attributes)) return null
  const invoiceId = (attributes as { attributes?: unknown }).attributes
  if (!invoiceId || typeof invoiceId !== 'object' || !('invoice_id' in invoiceId)) return null
  const value = (invoiceId as { invoice_id?: unknown }).invoice_id
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) return null
  const query = new URLSearchParams({ 'filter[invoice_id]': String(value), 'page[size]': '25' })
  return {
    url: `https://api.parasut.com/v4/${companyId}${SALES_INVOICES_PATH}?${query.toString()}`,
    method: 'GET',
    headers: { accept: 'application/vnd.api+json', authorization: `Bearer ${accessToken}` },
  }
}

/** Accepts only a numeric JSON:API sales invoice resource identifier. */
export function parseParasutCreatedSalesInvoiceId(value: unknown): string | null {
  if (!value || typeof value !== 'object' || !('data' in value)) return null
  const data = (value as { data?: unknown }).data
  if (!data || typeof data !== 'object' || !('type' in data) || !('id' in data)) return null
  const resource = data as { type?: unknown; id?: unknown }
  return resource.type === 'sales_invoices' && typeof resource.id === 'string' && numericId(resource.id) ? resource.id : null
}

/** Accepts a single exact JSON:API list result; zero or multiple rows stay ambiguous. */
export function parseParasutReconciledSalesInvoiceId(value: unknown): string | null {
  if (!value || typeof value !== 'object' || !('data' in value)) return null
  const data = (value as { data?: unknown }).data
  if (!Array.isArray(data) || data.length !== 1) return null
  const resource = data[0]
  if (!resource || typeof resource !== 'object' || !('type' in resource) || !('id' in resource)) return null
  const item = resource as { type?: unknown; id?: unknown }
  return item.type === 'sales_invoices' && typeof item.id === 'string' && numericId(item.id) ? item.id : null
}

function providerErrorReason(status: number): Extract<ParasutSalesInvoiceCreateResult, { status: 'provider_error' }>['reason'] {
  if (status === 401 || status === 403) return 'authentication'
  if (status === 422) return 'validation'
  if (status === 429) return 'rate_limited'
  if (status >= 500) return 'unavailable'
  return 'unknown'
}

/** Executes one claimed draft create and turns uncertain outcomes into reconciliation work. */
export async function executeParasutSalesInvoiceDraft(
  input: ParasutSalesInvoiceCreateInput,
  store: ParasutSalesInvoiceCreateStore,
  transport: ParasutSalesInvoiceCreateTransport,
): Promise<ParasutSalesInvoiceCreateResult> {
  if (!input.workspaceId.trim()) throw new Error('parasut sales invoice workspace is required')
  if (input.mappedPayload.requestFingerprint !== input.expectedRequestFingerprint) {
    return { status: 'reconciliation_required', reason: 'request_changed' }
  }

  const request = buildParasutSalesInvoiceCreateRequest(input.companyId, input.accessToken, input.mappedPayload)

  const claim = await store.claimQueued(input.invoiceRecordId)
  if (!claim.claimed) {
    if (claim.state === 'provider_draft_created' && claim.providerInvoiceId) return { status: 'provider_draft_created', providerInvoiceId: claim.providerInvoiceId, duplicate: true }
    return { status: 'provider_error', reason: 'not_claimable' }
  }

  let response: ParasutSalesInvoiceCreateTransportResponse
  try {
    response = await transport.post(request)
  } catch {
    const lookup = buildParasutSalesInvoiceLookupRequest(input.companyId, input.accessToken, input.mappedPayload)
    if (lookup && transport.get) {
      try {
        const reconciliation = await transport.get(lookup)
        const reconciledId = reconciliation.status === 200 ? parseParasutReconciledSalesInvoiceId(reconciliation.json) : null
        if (reconciledId) {
          await store.markDraftCreated(input.invoiceRecordId, reconciledId)
          return { status: 'provider_draft_created', providerInvoiceId: reconciledId, duplicate: true }
        }
      } catch {
        await store.markReconciliationRequired(input.invoiceRecordId)
        return { status: 'reconciliation_required', reason: 'reconciliation_lookup_failed' }
      }
    }
    await store.markReconciliationRequired(input.invoiceRecordId)
    return { status: 'reconciliation_required', reason: 'transport_timeout' }
  }

  const providerInvoiceId = parseParasutCreatedSalesInvoiceId(response.json)
  if ((response.status >= 200 && response.status < 300) || response.status === 409) {
    if (providerInvoiceId) {
      await store.markDraftCreated(input.invoiceRecordId, providerInvoiceId)
      return { status: 'provider_draft_created', providerInvoiceId, duplicate: response.status === 409 }
    }
    const lookup = buildParasutSalesInvoiceLookupRequest(input.companyId, input.accessToken, input.mappedPayload)
    if (lookup && transport.get) {
      try {
        const reconciliation = await transport.get(lookup)
        const reconciledId = reconciliation.status === 200 ? parseParasutReconciledSalesInvoiceId(reconciliation.json) : null
        if (reconciledId) {
          await store.markDraftCreated(input.invoiceRecordId, reconciledId)
          return { status: 'provider_draft_created', providerInvoiceId: reconciledId, duplicate: true }
        }
      } catch {
        await store.markReconciliationRequired(input.invoiceRecordId)
        return { status: 'reconciliation_required', reason: 'reconciliation_lookup_failed' }
      }
    }
    await store.markReconciliationRequired(input.invoiceRecordId)
    return { status: 'reconciliation_required', reason: response.status === 409 ? 'provider_conflict_without_id' : 'ambiguous_provider_result' }
  }

  await store.markProviderError(input.invoiceRecordId)
  return { status: 'provider_error', reason: providerErrorReason(response.status) }
}

type InvoiceRecordCreateClient = Pick<PrismaClient, 'invoiceRecord'>
type InvoiceRecordCreateScope = { workspaceId: string; invoiceRecordId: string; provider: string }

function assertScope(scope: InvoiceRecordCreateScope): void {
  if (!scope.workspaceId || !scope.invoiceRecordId || scope.provider !== 'parasut') throw new Error('parasut sales invoice store scope is invalid')
}

/** Creates a tenant-scoped durable claim store backed by InvoiceRecord. */
export function createParasutSalesInvoiceCreateStoreFromClient(client: InvoiceRecordCreateClient, scope: InvoiceRecordCreateScope): ParasutSalesInvoiceCreateStore {
  assertScope(scope)
  const where = { id: scope.invoiceRecordId, workspaceId: scope.workspaceId, provider: scope.provider }
  return {
    async claimQueued(invoiceRecordId) {
      if (invoiceRecordId !== scope.invoiceRecordId) return { claimed: false, state: 'not_found', providerInvoiceId: null }
      const claimed = await client.invoiceRecord.updateMany({ where: { ...where, state: 'queued' }, data: { state: 'provider_draft_submitting' } })
      if (claimed.count === 1) return { claimed: true }
      const current = await client.invoiceRecord.findFirst({ where, select: { state: true, providerInvoiceId: true } })
      return current ? { claimed: false, state: current.state, providerInvoiceId: current.providerInvoiceId } : { claimed: false, state: 'not_found', providerInvoiceId: null }
    },
    async markDraftCreated(invoiceRecordId, providerInvoiceId) {
      const result = await client.invoiceRecord.updateMany({ where: { ...where, id: invoiceRecordId, state: 'provider_draft_submitting' }, data: { state: 'provider_draft_created', providerInvoiceId } })
      if (result.count !== 1) throw new Error('parasut sales invoice draft confirmation lost')
    },
    async markReconciliationRequired(invoiceRecordId) {
      const result = await client.invoiceRecord.updateMany({ where: { ...where, id: invoiceRecordId, state: 'provider_draft_submitting' }, data: { state: 'reconciliation_required' } })
      if (result.count !== 1) throw new Error('parasut sales invoice reconciliation transition lost')
    },
    async markProviderError(invoiceRecordId) {
      const result = await client.invoiceRecord.updateMany({ where: { ...where, id: invoiceRecordId, state: 'provider_draft_submitting' }, data: { state: 'provider_error' } })
      if (result.count !== 1) throw new Error('parasut sales invoice provider error transition lost')
    },
  }
}

export function createParasutSalesInvoiceCreateStore(scope: InvoiceRecordCreateScope): ParasutSalesInvoiceCreateStore {
  return createParasutSalesInvoiceCreateStoreFromClient(db, scope)
}
