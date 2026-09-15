import { createHash } from 'node:crypto'
import { buildParasutProductCreateRequest, parseParasutCreatedProductId, type ParasutProductCreateInput, type ParasutProductResolution } from '@/lib/providers/parasut-product'

export type ParasutProductCreateCommand = {
  workspaceId: string
  connectionId: string
  companyId: string
  sourceReference: string
  lookupFingerprint: string
  requestFingerprint: string
  approvedById: string
  status: 'approved'
}

export type ParasutProductCreateExecution = {
  status: 'approved'
  command: ParasutProductCreateCommand
  /** Transient provider request; never persist or return this from an API route. */
  request: ReturnType<typeof buildParasutProductCreateRequest>
}

export type ParasutProductCreatePreparation =
  | { status: 'approval_required'; reason: 'resolution_not_create_required' | 'operator_approval_required' }
  | ParasutProductCreateExecution

export type ParasutProductCreateTransport = (request: ReturnType<typeof buildParasutProductCreateRequest>) => Promise<{ status: number; body: unknown }>

export type ParasutProductExecutionResult =
  | { status: 'confirmed'; commandId: string; providerProductId: string }
  | { status: 'duplicate'; commandId: string; providerProductId: string | null }
  | { status: 'reconciliation_required'; commandId: string; reason: 'ambiguous_provider_result' | 'stale_lookup' | 'command_not_claimable' }
  | { status: 'failed'; commandId: string; kind: 'authentication' | 'rate_limited' | 'unavailable' | 'invalid'; retryable: boolean }

export type ParasutProductExecutionStore = {
  claimApproved(commandId: string): Promise<{ claimed: true } | { claimed: false; status: string; providerProductId: string | null }>
  markConfirmed(commandId: string, providerProductId: string): Promise<void>
  markReconciliationRequired(commandId: string): Promise<void>
  markFailed(commandId: string): Promise<void>
}

function identifier(value: string, field: string): string {
  const normalized = value.trim()
  if (!normalized || normalized.length > 200 || /[\r\n]/.test(normalized)) throw new Error(`${field} is invalid`)
  return normalized
}

function fingerprint(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value), 'utf8').digest('hex')
}

export function parasutProductCreateFingerprint(input: { workspaceId: string; connectionId: string; companyId: string; sourceReference: string; lookupFingerprint: string; body: string }): string {
  return fingerprint({ version: 'parasut-product-create-v1', workspaceId: input.workspaceId, connectionId: input.connectionId, companyId: input.companyId, sourceReference: input.sourceReference, lookupFingerprint: input.lookupFingerprint, body: input.body })
}

/** Builds metadata-only persistence data after a fresh lookup and explicit approval. */
export function prepareParasutProductCreateCommand(input: {
  workspaceId: string
  connectionId: string
  companyId: string
  sourceReference: string
  lookupFingerprint: string
  resolution: ParasutProductResolution
  createInput: ParasutProductCreateInput
  approvedById?: string
  accessToken: string
}): ParasutProductCreatePreparation {
  if (input.resolution.status !== 'create_required') return { status: 'approval_required', reason: 'resolution_not_create_required' }
  if (!input.approvedById) return { status: 'approval_required', reason: 'operator_approval_required' }
  const workspaceId = identifier(input.workspaceId, 'workspaceId')
  const connectionId = identifier(input.connectionId, 'connectionId')
  const companyId = identifier(input.companyId, 'companyId')
  const sourceReference = identifier(input.sourceReference, 'sourceReference')
  const lookupFingerprint = identifier(input.lookupFingerprint, 'lookupFingerprint')
  const approvedById = identifier(input.approvedById, 'approvedById')
  const request = buildParasutProductCreateRequest(companyId, input.accessToken, input.createInput)
  const requestFingerprint = parasutProductCreateFingerprint({ workspaceId, connectionId, companyId, sourceReference, lookupFingerprint, body: request.body })
  return {
    status: 'approved',
    command: { status: 'approved', workspaceId, connectionId, companyId, sourceReference, lookupFingerprint, requestFingerprint, approvedById },
    request,
  }
}

export type ParasutProductCommandStore = {
  findUnique(args: { where: { workspaceId_requestFingerprint: { workspaceId: string; requestFingerprint: string } } }): Promise<{ id: string; status: string } | null>
  create(args: { data: { workspaceId: string; connectionId: string; companyId: string; sourceReference: string; lookupFingerprint: string; requestFingerprint: string; status: string; approvedById: string } }): Promise<{ id: string; status: string }>
}

export async function persistParasutProductCreateCommand(command: ParasutProductCreateCommand, store: ParasutProductCommandStore): Promise<{ status: 'created' | 'duplicate'; commandId: string }> {
  const where = { workspaceId_requestFingerprint: { workspaceId: command.workspaceId, requestFingerprint: command.requestFingerprint } }
  const existing = await store.findUnique({ where })
  if (existing) return { status: 'duplicate', commandId: existing.id }
  try {
    const created = await store.create({ data: { workspaceId: command.workspaceId, connectionId: command.connectionId, companyId: command.companyId, sourceReference: command.sourceReference, lookupFingerprint: command.lookupFingerprint, requestFingerprint: command.requestFingerprint, status: 'approved', approvedById: command.approvedById } })
    return { status: 'created', commandId: created.id }
  } catch (error) {
    // The unique index is the final race-safe fence when two operators approve the same product together.
    const concurrent = await store.findUnique({ where })
    if (concurrent) return { status: 'duplicate', commandId: concurrent.id }
    throw error
  }
}

function providerFailure(status: number): { kind: 'authentication' | 'rate_limited' | 'unavailable' | 'invalid'; retryable: boolean } {
  if (status === 401 || status === 403) return { kind: 'authentication', retryable: false }
  if (status === 429) return { kind: 'rate_limited', retryable: true }
  if (status >= 500 && status <= 599) return { kind: 'unavailable', retryable: true }
  return { kind: 'invalid', retryable: false }
}

/** Executes one approved product command; ambiguous outcomes never trigger a blind retry. */
export async function executeParasutProductCreateCommand(input: {
  commandId: string
  command: ParasutProductCreateCommand
  request: ReturnType<typeof buildParasutProductCreateRequest>
  currentLookupFingerprint: string
  currentResolution: ParasutProductResolution
  transport: ParasutProductCreateTransport
  store: ParasutProductExecutionStore
}): Promise<ParasutProductExecutionResult> {
  if (input.command.status !== 'approved') return { status: 'reconciliation_required', commandId: input.commandId, reason: 'command_not_claimable' }
  if (input.currentResolution.status !== 'create_required' || input.currentLookupFingerprint !== input.command.lookupFingerprint) return { status: 'reconciliation_required', commandId: input.commandId, reason: 'stale_lookup' }
  if (input.request.method !== 'POST' || input.request.url !== `https://api.parasut.com/v4/${input.command.companyId}/products` || parasutProductCreateFingerprint({ workspaceId: input.command.workspaceId, connectionId: input.command.connectionId, companyId: input.command.companyId, sourceReference: input.command.sourceReference, lookupFingerprint: input.command.lookupFingerprint, body: input.request.body }) !== input.command.requestFingerprint) return { status: 'reconciliation_required', commandId: input.commandId, reason: 'stale_lookup' }
  const claim = await input.store.claimApproved(input.commandId)
  if (!claim.claimed) {
    if (claim.status === 'confirmed') return { status: 'duplicate', commandId: input.commandId, providerProductId: claim.providerProductId }
    return { status: 'reconciliation_required', commandId: input.commandId, reason: 'command_not_claimable' }
  }
  try {
    const response = await input.transport(input.request)
    const providerProductId = parseParasutCreatedProductId(response.body)
    if (response.status >= 200 && response.status < 300 && providerProductId) {
      await input.store.markConfirmed(input.commandId, providerProductId)
      return { status: 'confirmed', commandId: input.commandId, providerProductId }
    }
    if (response.status === 409 && providerProductId) {
      await input.store.markConfirmed(input.commandId, providerProductId)
      return { status: 'confirmed', commandId: input.commandId, providerProductId }
    }
    if (response.status >= 200 && response.status < 300) {
      await input.store.markReconciliationRequired(input.commandId)
      return { status: 'reconciliation_required', commandId: input.commandId, reason: 'ambiguous_provider_result' }
    }
    const failure = providerFailure(response.status)
    await input.store.markFailed(input.commandId)
    return { status: 'failed', commandId: input.commandId, ...failure }
  } catch {
    await input.store.markReconciliationRequired(input.commandId)
    return { status: 'reconciliation_required', commandId: input.commandId, reason: 'ambiguous_provider_result' }
  }
}
