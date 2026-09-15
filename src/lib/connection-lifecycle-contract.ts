export const CONNECTION_LIFECYCLE_STATES = Object.freeze(['pending_verification', 'active', 'disabled', 'revoked'] as const)
export type ConnectionLifecycleState = (typeof CONNECTION_LIFECYCLE_STATES)[number]

export type ConnectionLifecycleDescriptor = Readonly<{
  connectionId: string
  state: ConnectionLifecycleState
  credentialKeyId: string | null
  updatedAtMs: number
}>

export type ConnectionLifecycleResult =
  | { ok: true; connection: ConnectionLifecycleDescriptor }
  | {
      ok: false
      reason:
        | 'input_invalid'
        | 'secret_forbidden'
        | 'connection_mismatch'
        | 'state_invalid'
        | 'credential_key_invalid'
        | 'time_invalid'
        | 'transition_invalid'
        | 'revoked_terminal'
        | 'connection_not_active'
        | 'stale_credential'
    }

export type ConnectionJobGateResult =
  | { ok: true }
  | { ok: false; reason: 'input_invalid' | 'connection_mismatch' | 'connection_not_active' | 'revoked_terminal' | 'stale_credential' }

const SAFE_ID_PATTERN = /^[A-Za-z0-9._-]{1,120}$/
const ALLOWED_KEYS = new Set(['connectionId', 'state', 'credentialKeyId', 'updatedAtMs'])
const SECRET_KEYS = new Set(['secret', 'token', 'apiKey', 'api_key', 'password', 'privateKey', 'private_key', 'clientSecret', 'client_secret', 'credentials', 'credentialsEnvelope'])

function safeId(value: unknown) {
  return typeof value === 'string' && SAFE_ID_PATTERN.test(value.trim()) ? value.trim() : null
}

function safeTime(value: unknown) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null
}

function isState(value: unknown): value is ConnectionLifecycleState {
  return (CONNECTION_LIFECYCLE_STATES as readonly unknown[]).includes(value)
}

/** Normalizes lifecycle metadata without exposing or accepting credential values. */
export function normalizeConnectionLifecycle(input: unknown, expectedConnectionId?: string): ConnectionLifecycleResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, reason: 'input_invalid' }
  const value = input as Record<string, unknown>
  if (Object.keys(value).some(key => SECRET_KEYS.has(key))) return { ok: false, reason: 'secret_forbidden' }
  if (Object.keys(value).some(key => !ALLOWED_KEYS.has(key))) return { ok: false, reason: 'input_invalid' }
  const connectionId = safeId(value.connectionId)
  if (!connectionId) return { ok: false, reason: 'input_invalid' }
  if (expectedConnectionId !== undefined && connectionId !== expectedConnectionId) return { ok: false, reason: 'connection_mismatch' }
  if (!isState(value.state)) return { ok: false, reason: 'state_invalid' }
  const credentialKeyId = value.credentialKeyId === null ? null : safeId(value.credentialKeyId)
  if (value.credentialKeyId !== null && !credentialKeyId) return { ok: false, reason: 'credential_key_invalid' }
  const updatedAtMs = safeTime(value.updatedAtMs)
  if (updatedAtMs === null) return { ok: false, reason: 'time_invalid' }
  return { ok: true, connection: { connectionId, state: value.state, credentialKeyId, updatedAtMs } }
}

/** Revocation is terminal; disable/active transitions are explicit and auditable. */
export function canTransitionConnectionLifecycle(from: ConnectionLifecycleState, to: ConnectionLifecycleState) {
  if (from === 'revoked') return false
  return (
    (from === 'pending_verification' && (to === 'active' || to === 'disabled' || to === 'revoked')) ||
    (from === 'active' && (to === 'disabled' || to === 'revoked')) ||
    (from === 'disabled' && (to === 'active' || to === 'revoked'))
  )
}

/** Applies a lifecycle transition without changing credential material. */
export function transitionConnectionLifecycle(
  current: unknown,
  to: ConnectionLifecycleState,
  nowMs: number,
  expectedConnectionId?: string,
): ConnectionLifecycleResult {
  const normalized = normalizeConnectionLifecycle(current, expectedConnectionId)
  if (!normalized.ok) return normalized
  if (!isState(to)) return { ok: false, reason: 'state_invalid' }
  if (!canTransitionConnectionLifecycle(normalized.connection.state, to)) {
    return { ok: false, reason: normalized.connection.state === 'revoked' ? 'revoked_terminal' : 'transition_invalid' }
  }
  if (safeTime(nowMs) === null || nowMs < normalized.connection.updatedAtMs) return { ok: false, reason: 'time_invalid' }
  return {
    ok: true,
    connection: { ...normalized.connection, state: to, updatedAtMs: nowMs },
  }
}

/** Blocks queued work when the connection is not active or its credential version is stale. */
export function evaluateConnectionJobGate(input: unknown): ConnectionJobGateResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, reason: 'input_invalid' }
  const value = input as Record<string, unknown>
  const connection = normalizeConnectionLifecycle(value.connection)
  if (!connection.ok) return { ok: false, reason: 'input_invalid' }
  const jobConnectionId = safeId(value.jobConnectionId)
  if (!jobConnectionId) return { ok: false, reason: 'input_invalid' }
  if (jobConnectionId !== connection.connection.connectionId) return { ok: false, reason: 'connection_mismatch' }
  if (connection.connection.state === 'revoked') return { ok: false, reason: 'revoked_terminal' }
  if (connection.connection.state !== 'active') return { ok: false, reason: 'connection_not_active' }
  if (connection.connection.credentialKeyId === null) return { ok: false, reason: 'stale_credential' }
  const jobCredentialKeyId = safeId(value.jobCredentialKeyId)
  if (!jobCredentialKeyId) return { ok: false, reason: 'stale_credential' }
  if (jobCredentialKeyId !== connection.connection.credentialKeyId) return { ok: false, reason: 'stale_credential' }
  return { ok: true }
}
