import type { PrismaClient } from '@prisma/client'
import { db } from '@/lib/db'

const BASE_URL = 'https://api.parasut.com/v4'
const TRACKABLE_JOBS_PATH = '/trackable_jobs'
export const PARASUT_TRACKABLE_JOB_WINDOW_MS = 15 * 60 * 1000

export type ParasutTrackableJobStatus = 'running' | 'done' | 'error'
export type ParasutProviderJobStatus = 'pending' | 'running' | 'done' | 'error'

export type ParasutTrackableJob = {
  providerJobId: string
  status: ParasutTrackableJobStatus
  providerStatus: ParasutProviderJobStatus
}

export type ParasutTrackableJobRequest = {
  url: string
  method: 'GET'
  headers: { accept: string; authorization: string }
}

export type ParasutTrackableJobTransportResponse = {
  status: number
  json?: unknown
}

export type ParasutTrackableJobTransport = {
  get(request: ParasutTrackableJobRequest): Promise<ParasutTrackableJobTransportResponse>
}

export type ParasutJobPollingStore = {
  claimPending(invoiceRecordId: string, cutoff: Date): Promise<{ claimed: true; providerJobId: string } | { claimed: false; state: string; providerJobId: string | null; providerJobCreatedAt: Date | null }>
  markPending(invoiceRecordId: string): Promise<void>
  markIssued(invoiceRecordId: string): Promise<void>
  markFormalizationError(invoiceRecordId: string): Promise<void>
  markReconciliationRequired(invoiceRecordId: string): Promise<void>
  markExpiredPending(invoiceRecordId: string): Promise<void>
  markProviderError(invoiceRecordId: string): Promise<void>
}

export type ParasutJobPollingInput = {
  workspaceId: string
  invoiceRecordId: string
  companyId: string
  providerJobId: string
  accessToken: string
  now?: Date
}

export type ParasutJobPollingResult =
  | { status: 'running'; providerJobId: string }
  | { status: 'done'; providerJobId: string; duplicate: boolean }
  | { status: 'error'; providerJobId: string }
  | { status: 'reconciliation_required'; reason: 'expired' | 'ambiguous_provider_result' | 'transport_timeout' | 'job_id_mismatch' | 'job_not_found' }
  | { status: 'provider_error'; reason: 'not_claimable' | 'authentication' | 'validation' | 'rate_limited' | 'unavailable' | 'unexpected_status' }

function numericId(value: string): boolean {
  return /^\d+$/.test(value) && value !== '0'
}

function assertRequestInput(companyId: string, providerJobId: string, accessToken: string): void {
  if (!numericId(companyId)) throw new Error('parasut company id is invalid')
  if (!numericId(providerJobId)) throw new Error('parasut provider job id is invalid')
  if (!accessToken.trim()) throw new Error('parasut access token is required')
}

/** Builds the bounded, server-only GET request for a Paraşüt Trackable Job. */
export function buildParasutTrackableJobRequest(companyId: string, providerJobId: string, accessToken: string): ParasutTrackableJobRequest {
  assertRequestInput(companyId, providerJobId, accessToken)
  return {
    url: `${BASE_URL}/${companyId}${TRACKABLE_JOBS_PATH}/${providerJobId}`,
    method: 'GET',
    headers: { accept: 'application/vnd.api+json', authorization: `Bearer ${accessToken}` },
  }
}

/** Accepts only the provider's bounded trackable-job status contract. */
export function parseParasutTrackableJob(value: unknown): ParasutTrackableJob | null {
  if (!value || typeof value !== 'object' || !('data' in value)) return null
  const data = (value as { data?: unknown }).data
  if (!data || typeof data !== 'object' || !('type' in data) || !('id' in data) || !('attributes' in data)) return null
  const resource = data as { type?: unknown; id?: unknown; attributes?: unknown }
  if (resource.type !== 'trackable_jobs' || typeof resource.id !== 'string' || !numericId(resource.id) || !resource.attributes || typeof resource.attributes !== 'object') return null
  const status = (resource.attributes as { status?: unknown }).status
  if (status !== 'pending' && status !== 'running' && status !== 'done' && status !== 'error') return null
  return { providerJobId: resource.id, status: status === 'pending' ? 'running' : status, providerStatus: status }
}

function providerErrorReason(status: number): Extract<ParasutJobPollingResult, { status: 'provider_error' }>['reason'] {
  if (status === 401 || status === 403) return 'authentication'
  if (status === 422) return 'validation'
  if (status === 429) return 'rate_limited'
  if (status >= 500) return 'unavailable'
  return 'unexpected_status'
}

/** Polls one job only inside the provider's documented 15-minute usage window. */
export async function executeParasutJobPolling(input: ParasutJobPollingInput, store: ParasutJobPollingStore, transport: ParasutTrackableJobTransport): Promise<ParasutJobPollingResult> {
  if (!input.workspaceId.trim()) throw new Error('parasut job polling workspace is required')
  const now = input.now ?? new Date()
  if (Number.isNaN(now.getTime())) throw new Error('polling time is invalid')
  assertRequestInput(input.companyId, input.providerJobId, input.accessToken)
  const cutoff = new Date(now.getTime() - PARASUT_TRACKABLE_JOB_WINDOW_MS)
  const claim = await store.claimPending(input.invoiceRecordId, cutoff)
  if (!claim.claimed) {
    if (claim.state === 'formalization_pending' && claim.providerJobId === input.providerJobId && (!claim.providerJobCreatedAt || claim.providerJobCreatedAt < cutoff)) {
      await store.markExpiredPending(input.invoiceRecordId)
      return { status: 'reconciliation_required', reason: 'expired' }
    }
    if (claim.state === 'issued' && claim.providerJobId === input.providerJobId) return { status: 'done', providerJobId: input.providerJobId, duplicate: true }
    return { status: 'provider_error', reason: 'not_claimable' }
  }
  if (claim.providerJobId !== input.providerJobId) {
    await store.markReconciliationRequired(input.invoiceRecordId)
    return { status: 'reconciliation_required', reason: 'job_id_mismatch' }
  }

  const request = buildParasutTrackableJobRequest(input.companyId, input.providerJobId, input.accessToken)
  let response: ParasutTrackableJobTransportResponse
  try {
    response = await transport.get(request)
  } catch {
    await store.markPending(input.invoiceRecordId)
    return { status: 'provider_error', reason: 'unavailable' }
  }

  if (response.status === 404) {
    await store.markReconciliationRequired(input.invoiceRecordId)
    return { status: 'reconciliation_required', reason: 'job_not_found' }
  }
  if (response.status !== 200) {
    if (response.status === 429 || response.status >= 500) await store.markPending(input.invoiceRecordId)
    else await store.markProviderError(input.invoiceRecordId)
    return { status: 'provider_error', reason: providerErrorReason(response.status) }
  }

  const job = parseParasutTrackableJob(response.json)
  if (!job) {
    await store.markReconciliationRequired(input.invoiceRecordId)
    return { status: 'reconciliation_required', reason: 'ambiguous_provider_result' }
  }
  if (job.providerJobId !== input.providerJobId) {
    await store.markReconciliationRequired(input.invoiceRecordId)
    return { status: 'reconciliation_required', reason: 'job_id_mismatch' }
  }
  if (job.status === 'running') {
    await store.markPending(input.invoiceRecordId)
    return { status: 'running', providerJobId: job.providerJobId }
  }
  if (job.status === 'done') {
    await store.markIssued(input.invoiceRecordId)
    return { status: 'done', providerJobId: job.providerJobId, duplicate: false }
  }
  await store.markFormalizationError(input.invoiceRecordId)
  return { status: 'error', providerJobId: job.providerJobId }
}

type InvoiceRecordJobClient = Pick<PrismaClient, 'invoiceRecord'>
type InvoiceRecordJobScope = { workspaceId: string; invoiceRecordId: string; provider: string }

function assertScope(scope: InvoiceRecordJobScope): void {
  if (!scope.workspaceId || !scope.invoiceRecordId || scope.provider !== 'parasut') throw new Error('parasut job polling store scope is invalid')
}

/** Creates the tenant/provider-scoped atomic polling state adapter. */
export function createParasutJobPollingStoreFromClient(client: InvoiceRecordJobClient, scope: InvoiceRecordJobScope): ParasutJobPollingStore {
  assertScope(scope)
  const where = { id: scope.invoiceRecordId, workspaceId: scope.workspaceId, provider: scope.provider }
  return {
    async claimPending(invoiceRecordId, cutoff) {
      if (invoiceRecordId !== scope.invoiceRecordId) return { claimed: false, state: 'not_found', providerJobId: null, providerJobCreatedAt: null }
      const claimed = await client.invoiceRecord.updateMany({ where: { ...where, state: 'formalization_pending', providerJobId: { not: null }, providerJobCreatedAt: { not: null, gte: cutoff } }, data: { state: 'formalization_polling' } })
      if (claimed.count === 1) {
        const current = await client.invoiceRecord.findFirst({ where, select: { providerJobId: true } })
        if (current?.providerJobId) return { claimed: true, providerJobId: current.providerJobId }
      }
      const current = await client.invoiceRecord.findFirst({ where, select: { state: true, providerJobId: true, providerJobCreatedAt: true } })
      return current ? { claimed: false, state: current.state, providerJobId: current.providerJobId, providerJobCreatedAt: current.providerJobCreatedAt } : { claimed: false, state: 'not_found', providerJobId: null, providerJobCreatedAt: null }
    },
    async markPending(invoiceRecordId) {
      const result = await client.invoiceRecord.updateMany({ where: { ...where, id: invoiceRecordId, state: 'formalization_polling' }, data: { state: 'formalization_pending' } })
      if (result.count !== 1) throw new Error('parasut job polling pending transition lost')
    },
    async markIssued(invoiceRecordId) {
      const result = await client.invoiceRecord.updateMany({ where: { ...where, id: invoiceRecordId, state: 'formalization_polling' }, data: { state: 'issued' } })
      if (result.count !== 1) throw new Error('parasut job issued transition lost')
    },
    async markFormalizationError(invoiceRecordId) {
      const result = await client.invoiceRecord.updateMany({ where: { ...where, id: invoiceRecordId, state: 'formalization_polling' }, data: { state: 'formalization_error' } })
      if (result.count !== 1) throw new Error('parasut job formalization error transition lost')
    },
    async markReconciliationRequired(invoiceRecordId) {
      const result = await client.invoiceRecord.updateMany({ where: { ...where, id: invoiceRecordId, state: 'formalization_polling' }, data: { state: 'reconciliation_required' } })
      if (result.count !== 1) throw new Error('parasut job reconciliation transition lost')
    },
    async markExpiredPending(invoiceRecordId) {
      const result = await client.invoiceRecord.updateMany({ where: { ...where, id: invoiceRecordId, state: 'formalization_pending' }, data: { state: 'reconciliation_required' } })
      if (result.count !== 1) throw new Error('parasut expired job transition lost')
    },
    async markProviderError(invoiceRecordId) {
      const result = await client.invoiceRecord.updateMany({ where: { ...where, id: invoiceRecordId, state: 'formalization_polling' }, data: { state: 'provider_error' } })
      if (result.count !== 1) throw new Error('parasut job provider error transition lost')
    },
  }
}

export function createParasutJobPollingStore(scope: InvoiceRecordJobScope): ParasutJobPollingStore {
  return createParasutJobPollingStoreFromClient(db, scope)
}
