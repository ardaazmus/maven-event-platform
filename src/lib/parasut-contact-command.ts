import { createHash } from 'node:crypto'
import { buildParasutContactCreateRequest, parseParasutCreatedContactId, type ParasutContactCreateInput, type ParasutContactResolution } from '@/lib/providers/parasut-contact'

export type ParasutContactCreateCommand = {
  workspaceId: string
  connectionId: string
  companyId: string
  sourceReference: string
  lookupFingerprint: string
  requestFingerprint: string
  approvedById: string
  status: 'approved'
}

export type ParasutContactCreateExecution = {
  status: 'approved'
  command: ParasutContactCreateCommand
  /** Transient provider request; never persist or return this from an API route. */
  request: ReturnType<typeof buildParasutContactCreateRequest>
}

export type ParasutContactCreatePreparation =
  | { status: 'approval_required'; reason: 'resolution_not_create_required' | 'operator_approval_required' }
  | ParasutContactCreateExecution

function identifier(value: string, field: string): string {
  const normalized = value.trim()
  if (!normalized || normalized.length > 200 || /[\r\n]/.test(normalized)) throw new Error(`${field} is invalid`)
  return normalized
}

function fingerprint(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value), 'utf8').digest('hex')
}

export function parasutContactCreateFingerprint(input: { workspaceId: string; connectionId: string; companyId: string; sourceReference: string; lookupFingerprint: string; body: string }): string {
  return fingerprint({ version: 'parasut-contact-create-v1', workspaceId: input.workspaceId, connectionId: input.connectionId, companyId: input.companyId, sourceReference: input.sourceReference, lookupFingerprint: input.lookupFingerprint, body: input.body })
}

/** Builds a provider command only after a fresh, strong lookup says creation is required and an operator approves it. */
export function prepareParasutContactCreateCommand(input: {
  workspaceId: string
  connectionId: string
  companyId: string
  sourceReference: string
  lookupFingerprint: string
  resolution: ParasutContactResolution
  createInput: ParasutContactCreateInput
  approvedById?: string
  accessToken: string
}): ParasutContactCreatePreparation {
  if (input.resolution.status !== 'create_required') return { status: 'approval_required', reason: 'resolution_not_create_required' }
  if (!input.approvedById) return { status: 'approval_required', reason: 'operator_approval_required' }
  const workspaceId = identifier(input.workspaceId, 'workspaceId')
  const connectionId = identifier(input.connectionId, 'connectionId')
  const companyId = identifier(input.companyId, 'companyId')
  const sourceReference = identifier(input.sourceReference, 'sourceReference')
  const lookupFingerprint = identifier(input.lookupFingerprint, 'lookupFingerprint')
  const approvedById = identifier(input.approvedById, 'approvedById')
  const request = buildParasutContactCreateRequest(companyId, input.accessToken, input.createInput)
  const requestFingerprint = parasutContactCreateFingerprint({ workspaceId, connectionId, companyId, sourceReference, lookupFingerprint, body: request.body })
  return {
    status: 'approved',
    command: { status: 'approved', workspaceId, connectionId, companyId, sourceReference, lookupFingerprint, requestFingerprint, approvedById },
    request,
  }
}

export type ParasutContactCommandStore = {
  findUnique(args: { where: { workspaceId_requestFingerprint: { workspaceId: string; requestFingerprint: string } } }): Promise<{ id: string; status: string } | null>
  create(args: { data: { workspaceId: string; connectionId: string; companyId: string; sourceReference: string; requestFingerprint: string; status: string; approvedById: string } }): Promise<{ id: string; status: string }>
}

export type ParasutContactCreateTransport = (request: ReturnType<typeof buildParasutContactCreateRequest>) => Promise<{ status: number; body: unknown }>

export type ParasutContactExecutionResult =
  | { status: 'confirmed'; commandId: string; providerContactId: string }
  | { status: 'duplicate'; commandId: string; providerContactId: string | null }
  | { status: 'reconciliation_required'; commandId: string; reason: 'ambiguous_provider_result' | 'stale_lookup' | 'command_not_claimable' }
  | { status: 'failed'; commandId: string; kind: 'authentication' | 'rate_limited' | 'unavailable' | 'invalid'; retryable: boolean }

export type ParasutContactExecutionStore = {
  claimApproved(commandId: string): Promise<{ claimed: true } | { claimed: false; status: string; providerContactId: string | null }>
  markConfirmed(commandId: string, providerContactId: string): Promise<void>
  markReconciliationRequired(commandId: string): Promise<void>
  markFailed(commandId: string): Promise<void>
}

function providerFailure(status: number): { kind: 'authentication' | 'rate_limited' | 'unavailable' | 'invalid'; retryable: boolean } {
  if (status === 401 || status === 403) return { kind: 'authentication', retryable: false }
  if (status === 429) return { kind: 'rate_limited', retryable: true }
  if (status >= 500 && status <= 599) return { kind: 'unavailable', retryable: true }
  return { kind: 'invalid', retryable: false }
}

/** Executes one previously approved command; ambiguous provider outcomes never trigger an automatic retry. */
export async function executeParasutContactCreateCommand(input: {
  commandId: string
  command: ParasutContactCreateCommand
  request: ReturnType<typeof buildParasutContactCreateRequest>
  currentLookupFingerprint: string
  currentResolution: ParasutContactResolution
  transport: ParasutContactCreateTransport
  store: ParasutContactExecutionStore
}): Promise<ParasutContactExecutionResult> {
  if (input.command.status !== 'approved') return { status: 'reconciliation_required', commandId: input.commandId, reason: 'command_not_claimable' }
  if (input.currentResolution.status !== 'create_required' || input.currentLookupFingerprint !== input.command.lookupFingerprint) {
    return { status: 'reconciliation_required', commandId: input.commandId, reason: 'stale_lookup' }
  }
  if (input.request.method !== 'POST' || input.request.url !== `https://api.parasut.com/v4/${input.command.companyId}/contacts` || parasutContactCreateFingerprint({ workspaceId: input.command.workspaceId, connectionId: input.command.connectionId, companyId: input.command.companyId, sourceReference: input.command.sourceReference, lookupFingerprint: input.command.lookupFingerprint, body: input.request.body }) !== input.command.requestFingerprint) {
    return { status: 'reconciliation_required', commandId: input.commandId, reason: 'stale_lookup' }
  }
  const claim = await input.store.claimApproved(input.commandId)
  if (!claim.claimed) {
    if (claim.status === 'confirmed') return { status: 'duplicate', commandId: input.commandId, providerContactId: claim.providerContactId }
    return { status: 'reconciliation_required', commandId: input.commandId, reason: 'command_not_claimable' }
  }
  try {
    const response = await input.transport(input.request)
    const providerContactId = parseParasutCreatedContactId(response.body)
    if (response.status >= 200 && response.status < 300 && providerContactId) {
      await input.store.markConfirmed(input.commandId, providerContactId)
      return { status: 'confirmed', commandId: input.commandId, providerContactId }
    }
    if (response.status === 409 && providerContactId) {
      await input.store.markConfirmed(input.commandId, providerContactId)
      return { status: 'confirmed', commandId: input.commandId, providerContactId }
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

export async function persistParasutContactCreateCommand(command: ParasutContactCreateCommand, store: ParasutContactCommandStore): Promise<{ status: 'created' | 'duplicate'; commandId: string }> {
  const where = { workspaceId_requestFingerprint: { workspaceId: command.workspaceId, requestFingerprint: command.requestFingerprint } }
  const existing = await store.findUnique({ where })
  if (existing) return { status: 'duplicate', commandId: existing.id }
  try {
    const created = await store.create({ data: { workspaceId: command.workspaceId, connectionId: command.connectionId, companyId: command.companyId, sourceReference: command.sourceReference, requestFingerprint: command.requestFingerprint, status: 'approved', approvedById: command.approvedById } })
    return { status: 'created', commandId: created.id }
  } catch (error) {
    // The unique index is the final race-safe fence when two workers approve the same command together.
    const concurrent = await store.findUnique({ where })
    if (concurrent) return { status: 'duplicate', commandId: concurrent.id }
    throw error
  }
}
