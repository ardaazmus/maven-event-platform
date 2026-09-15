import { decryptParasutCredential } from '@/lib/parasut-credentials'
import { executeParasutContactCreateCommand, type ParasutContactCreateTransport, type ParasutContactExecutionResult, type ParasutContactExecutionStore } from '@/lib/parasut-contact-command'
import { buildParasutContactCreateRequest, resolveParasutContact, type ParasutContactCandidate, type ParasutContactCreateInput, type ParasutContactLookupInput } from '@/lib/providers/parasut-contact'

type StoredCommand = {
  id: string
  workspaceId: string
  connectionId: string
  companyId: string
  sourceReference: string
  lookupFingerprint: string
  requestFingerprint: string
  approvedById: string
  status: 'approved'
}

type WorkerSource = {
  workspaceId: string
  lookup: ParasutContactLookupInput
  createInput: ParasutContactCreateInput
}

type WorkerLookup = { lookupFingerprint: string; candidates: readonly ParasutContactCandidate[] }

export type ParasutContactWorkerResult =
  | ParasutContactExecutionResult
  | { status: 'not_found' | 'scope_mismatch' | 'connection_unavailable' | 'credential_unavailable' | 'source_unavailable' | 'lookup_failed'; commandId: string }

export type ParasutContactWorkerDependencies = {
  expectedWorkspaceId: string
  expectedConnectionId: string
  expectedCompanyId: string
  loadCommand: (commandId: string) => Promise<StoredCommand | null>
  loadConnection: (connectionId: string) => Promise<{ workspaceId: string; companyId: string | null; status: string; credentialsEnvelope: string | null } | null>
  loadSource: (workspaceId: string, sourceReference: string) => Promise<WorkerSource | null>
  lookup: (companyId: string, accessToken: string, input: ParasutContactLookupInput) => Promise<WorkerLookup>
  transport: ParasutContactCreateTransport
  store: ParasutContactExecutionStore
  decryptCredential?: (envelope: string) => string
}

function scopeMatches(input: ParasutContactWorkerDependencies, command: StoredCommand, connection: NonNullable<Awaited<ReturnType<ParasutContactWorkerDependencies['loadConnection']>>>): boolean {
  return input.expectedWorkspaceId === command.workspaceId && input.expectedWorkspaceId === connection.workspaceId && input.expectedConnectionId === command.connectionId && input.expectedCompanyId === command.companyId && connection.companyId === command.companyId
}

/** Runs one contact-create command through the private credential, lookup and execution boundaries. */
export async function runParasutContactCreateWorker(commandId: string, input: ParasutContactWorkerDependencies): Promise<ParasutContactWorkerResult> {
  const command = await input.loadCommand(commandId)
  if (!command) return { status: 'not_found', commandId }
  const connection = await input.loadConnection(command.connectionId)
  if (!connection || !scopeMatches(input, command, connection)) return { status: 'scope_mismatch', commandId }
  if (connection.status !== 'active' || !connection.credentialsEnvelope) return { status: 'connection_unavailable', commandId }

  let accessToken: string
  try {
    accessToken = (input.decryptCredential || decryptParasutCredential)(connection.credentialsEnvelope)
  } catch {
    return { status: 'credential_unavailable', commandId }
  }

  const source = await input.loadSource(command.workspaceId, command.sourceReference)
  if (!source || source.workspaceId !== command.workspaceId) return { status: 'source_unavailable', commandId }

  let current: WorkerLookup
  try {
    current = await input.lookup(command.companyId, accessToken, source.lookup)
  } catch {
    return { status: 'lookup_failed', commandId }
  }
  const resolution = resolveParasutContact({ candidates: current.candidates, query: { taxNumber: source.createInput.taxNumber, email: source.createInput.email, legalName: source.createInput.legalName } })
  const request = buildParasutContactCreateRequest(command.companyId, accessToken, source.createInput)
  return executeParasutContactCreateCommand({ commandId, command, request, currentLookupFingerprint: current.lookupFingerprint, currentResolution: resolution, transport: input.transport, store: input.store })
}
