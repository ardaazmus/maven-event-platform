export const CONNECTION_PURPOSES = Object.freeze(['payment', 'invoice', 'mail', 'media'] as const)
export type ConnectionPurpose = (typeof CONNECTION_PURPOSES)[number]

export const CONNECTION_ENVIRONMENTS = Object.freeze(['test', 'staging', 'live'] as const)
export type ConnectionEnvironment = (typeof CONNECTION_ENVIRONMENTS)[number]

export const CONNECTION_STATES = Object.freeze(['draft', 'verifying', 'verified', 'enabled', 'disabled', 'revoked'] as const)
export type ConnectionState = (typeof CONNECTION_STATES)[number]

export type ConnectionDescriptor = Readonly<{
  connectionId: string
  tenantId: string
  workspaceId: string
  purpose: ConnectionPurpose
  environment: ConnectionEnvironment
  state: ConnectionState
  provider: string
}>

export type ConnectionDescriptorResult =
  | { ok: true; connection: ConnectionDescriptor }
  | {
      ok: false
      reason: 'input_invalid' | 'secret_forbidden' | 'purpose_invalid' | 'environment_invalid' | 'state_invalid' | 'workspace_mismatch'
    }

const SECRET_KEYS = ['secret', 'token', 'apiKey', 'api_key', 'password', 'privateKey', 'private_key', 'clientSecret', 'client_secret']

function normalizedText(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

/**
 * Normalizes the shared connection identity only. Credentials, provider
 * payloads and capability evidence belong to later server-side boundaries.
 */
export function normalizeConnectionDescriptor(input: unknown, expectedWorkspaceId?: string): ConnectionDescriptorResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, reason: 'input_invalid' }
  const value = input as Record<string, unknown>
  if (Object.keys(value).some(key => SECRET_KEYS.includes(key))) return { ok: false, reason: 'secret_forbidden' }
  const connectionId = normalizedText(value.connectionId)
  const tenantId = normalizedText(value.tenantId)
  const workspaceId = normalizedText(value.workspaceId)
  const provider = normalizedText(value.provider)?.toLowerCase()
  if (!connectionId || !tenantId || !workspaceId || !provider) return { ok: false, reason: 'input_invalid' }
  if (expectedWorkspaceId !== undefined && workspaceId !== expectedWorkspaceId) return { ok: false, reason: 'workspace_mismatch' }
  if (!(CONNECTION_PURPOSES as readonly unknown[]).includes(value.purpose)) return { ok: false, reason: 'purpose_invalid' }
  if (!(CONNECTION_ENVIRONMENTS as readonly unknown[]).includes(value.environment)) return { ok: false, reason: 'environment_invalid' }
  if (!(CONNECTION_STATES as readonly unknown[]).includes(value.state)) return { ok: false, reason: 'state_invalid' }
  return {
    ok: true,
    connection: {
      connectionId,
      tenantId,
      workspaceId,
      purpose: value.purpose as ConnectionPurpose,
      environment: value.environment as ConnectionEnvironment,
      state: value.state as ConnectionState,
      provider,
    },
  }
}
