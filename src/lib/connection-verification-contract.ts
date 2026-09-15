import {
  CONNECTION_ENVIRONMENTS,
  CONNECTION_PURPOSES,
  type ConnectionEnvironment,
  type ConnectionPurpose,
} from '@/lib/connection-purpose-contract'

export const CONNECTION_VERIFICATION_STATES = Object.freeze(['draft', 'verifying', 'verified', 'enabled'] as const)
export const CONNECTION_CAPABILITY_STATUSES = Object.freeze(['verified', 'unknown', 'blocked'] as const)
export const CONNECTION_EVIDENCE_CLASSES = Object.freeze(['local', 'sandbox', 'external'] as const)

export type ConnectionVerificationState = (typeof CONNECTION_VERIFICATION_STATES)[number]
export type ConnectionCapabilityStatus = (typeof CONNECTION_CAPABILITY_STATUSES)[number]
export type ConnectionEvidenceClass = (typeof CONNECTION_EVIDENCE_CLASSES)[number]

export type ConnectionVerificationEvidence = Readonly<{
  evidenceId: string
  connectionId: string
  tenantId: string
  workspaceId: string
  purpose: ConnectionPurpose
  environment: ConnectionEnvironment
  state: ConnectionVerificationState
  checkedAtMs: number | null
  capabilityStatus: ConnectionCapabilityStatus
  evidenceClass: ConnectionEvidenceClass
}>

export type ConnectionVerificationResult =
  | { ok: true; evidence: ConnectionVerificationEvidence }
  | {
      ok: false
      reason:
        | 'input_invalid'
        | 'secret_forbidden'
        | 'connection_mismatch'
        | 'workspace_mismatch'
        | 'purpose_invalid'
        | 'environment_invalid'
        | 'state_invalid'
        | 'capability_invalid'
        | 'evidence_class_invalid'
        | 'checked_at_required'
        | 'checked_at_forbidden'
        | 'capability_unverified'
        | 'live_external_evidence_required'
        | 'transition_invalid'
        | 'time_invalid'
    }

export type ConnectionVerificationTransitionOptions = Readonly<{
  to: ConnectionVerificationState
  nowMs: number
  capabilityStatus?: ConnectionCapabilityStatus
  evidenceClass?: ConnectionEvidenceClass
}>

const SAFE_ID_PATTERN = /^[A-Za-z0-9._-]{1,120}$/
const ALLOWED_KEYS = new Set([
  'evidenceId',
  'connectionId',
  'tenantId',
  'workspaceId',
  'purpose',
  'environment',
  'state',
  'checkedAtMs',
  'capabilityStatus',
  'evidenceClass',
])
const SECRET_KEYS = new Set([
  'secret',
  'token',
  'apiKey',
  'api_key',
  'password',
  'privateKey',
  'private_key',
  'clientSecret',
  'client_secret',
  'rawResponse',
  'providerResponse',
  'payload',
])

function text(value: unknown) {
  return typeof value === 'string' && SAFE_ID_PATTERN.test(value.trim()) ? value.trim() : null
}

function safeTime(value: unknown) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null
}

function includesValue<T extends readonly unknown[]>(values: T, value: unknown): value is T[number] {
  return values.includes(value)
}

function containsForbiddenKey(value: unknown, seen = new Set<object>()): boolean {
  if (!value || typeof value !== 'object') return false
  if (seen.has(value)) return false
  seen.add(value)
  if (Array.isArray(value)) return value.some(item => containsForbiddenKey(item, seen))
  return Object.entries(value).some(([key, child]) => SECRET_KEYS.has(key) || containsForbiddenKey(child, seen))
}

type ConnectionVerificationFailure = Extract<ConnectionVerificationResult, { ok: false }>

function validateStateInvariants(value: Record<string, unknown>): ConnectionVerificationFailure['reason'] | null {
  const state = value.state as ConnectionVerificationState
  const checkedAtMs = value.checkedAtMs
  const capabilityStatus = value.capabilityStatus as ConnectionCapabilityStatus
  const evidenceClass = value.evidenceClass as ConnectionEvidenceClass
  if (state === 'draft' && checkedAtMs !== null) return 'checked_at_forbidden'
  if (state !== 'draft' && safeTime(checkedAtMs) === null) return 'checked_at_required'
  if ((state === 'verified' || state === 'enabled') && capabilityStatus !== 'verified') return 'capability_unverified'
  if (state === 'enabled' && value.environment === 'live' && evidenceClass !== 'external') return 'live_external_evidence_required'
  return null
}

/** Normalizes provider verification metadata without accepting secrets or raw responses. */
export function normalizeConnectionVerification(input: unknown, expectedConnectionId?: string, expectedWorkspaceId?: string): ConnectionVerificationResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, reason: 'input_invalid' }
  if (containsForbiddenKey(input)) return { ok: false, reason: 'secret_forbidden' }
  const value = input as Record<string, unknown>
  if (Object.keys(value).some(key => !ALLOWED_KEYS.has(key))) return { ok: false, reason: 'input_invalid' }
  const evidenceId = text(value.evidenceId)
  const connectionId = text(value.connectionId)
  const tenantId = text(value.tenantId)
  const workspaceId = text(value.workspaceId)
  if (!evidenceId || !connectionId || !tenantId || !workspaceId) return { ok: false, reason: 'input_invalid' }
  if (expectedConnectionId !== undefined && connectionId !== expectedConnectionId) return { ok: false, reason: 'connection_mismatch' }
  if (expectedWorkspaceId !== undefined && workspaceId !== expectedWorkspaceId) return { ok: false, reason: 'workspace_mismatch' }
  if (!includesValue(CONNECTION_PURPOSES, value.purpose)) return { ok: false, reason: 'purpose_invalid' }
  if (!includesValue(CONNECTION_ENVIRONMENTS, value.environment)) return { ok: false, reason: 'environment_invalid' }
  if (!includesValue(CONNECTION_VERIFICATION_STATES, value.state)) return { ok: false, reason: 'state_invalid' }
  if (!includesValue(CONNECTION_CAPABILITY_STATUSES, value.capabilityStatus)) return { ok: false, reason: 'capability_invalid' }
  if (!includesValue(CONNECTION_EVIDENCE_CLASSES, value.evidenceClass)) return { ok: false, reason: 'evidence_class_invalid' }
  if (value.state === 'draft' && value.checkedAtMs === undefined) value.checkedAtMs = null
  const invariantFailure = validateStateInvariants(value)
  if (invariantFailure) return { ok: false, reason: invariantFailure }
  return {
    ok: true,
    evidence: {
      evidenceId,
      connectionId,
      tenantId,
      workspaceId,
      purpose: value.purpose as ConnectionPurpose,
      environment: value.environment as ConnectionEnvironment,
      state: value.state as ConnectionVerificationState,
      checkedAtMs: value.checkedAtMs as number | null,
      capabilityStatus: value.capabilityStatus as ConnectionCapabilityStatus,
      evidenceClass: value.evidenceClass as ConnectionEvidenceClass,
    },
  }
}

/** Returns whether a connection can move through the explicit verification state machine. */
export function canTransitionConnectionVerification(from: ConnectionVerificationState, to: ConnectionVerificationState) {
  return (
    (from === 'draft' && to === 'verifying') ||
    (from === 'verifying' && (to === 'draft' || to === 'verified')) ||
    (from === 'verified' && (to === 'verifying' || to === 'enabled')) ||
    (from === 'enabled' && to === 'verifying')
  )
}

/** Produces the next metadata-only state; actual provider checks remain server-side. */
export function transitionConnectionVerification(
  current: unknown,
  options: ConnectionVerificationTransitionOptions,
  expectedConnectionId?: string,
  expectedWorkspaceId?: string,
): ConnectionVerificationResult {
  const normalized = normalizeConnectionVerification(current, expectedConnectionId, expectedWorkspaceId)
  if (!normalized.ok) return normalized
  if (!canTransitionConnectionVerification(normalized.evidence.state, options.to)) return { ok: false, reason: 'transition_invalid' }
  if (safeTime(options.nowMs) === null) return { ok: false, reason: 'time_invalid' }
  const nextCapability = options.capabilityStatus ?? (options.to === 'draft' ? 'unknown' : normalized.evidence.capabilityStatus)
  const nextEvidenceClass = options.evidenceClass ?? (options.to === 'draft' ? 'local' : normalized.evidence.evidenceClass)
  const next = {
    ...normalized.evidence,
    state: options.to,
    checkedAtMs: options.to === 'draft' ? null : options.nowMs,
    capabilityStatus: nextCapability,
    evidenceClass: nextEvidenceClass,
  }
  return normalizeConnectionVerification(next, expectedConnectionId, expectedWorkspaceId)
}
