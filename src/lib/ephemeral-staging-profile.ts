export type EphemeralStagingProfileInput = Readonly<{
  environment: unknown
  deploymentId: unknown
  namespace: unknown
  databaseMode: unknown
  objectStorageMode: unknown
  mailMode: unknown
  recipientDomain: unknown
  liveSecretProvided: unknown
  providerMutation: unknown
  cleanupConfirmed: unknown
}>

export type EphemeralStagingProfile = Readonly<{
  environment: 'staging'
  deploymentId: string
  namespace: string
  databaseMode: 'ephemeral'
  objectStorageMode: 'ephemeral'
  mailMode: 'sink'
  recipientDomain: 'test.invalid'
  providerMutation: 'sandbox_only'
  outboundNetwork: false
  productionMutation: false
  persistentData: false
  cleanupConfirmed: true
}>

export type EphemeralStagingProfileResult =
  | Readonly<{ ok: true; profile: EphemeralStagingProfile }>
  | Readonly<{
      ok: false
      reason:
        | 'input_invalid'
        | 'production_forbidden'
        | 'live_secret_forbidden'
        | 'persistent_mode_forbidden'
        | 'external_delivery_forbidden'
        | 'unsafe_identifier'
        | 'cleanup_required'
    }>

const PROFILE_KEYS = [
  'environment',
  'deploymentId',
  'namespace',
  'databaseMode',
  'objectStorageMode',
  'mailMode',
  'recipientDomain',
  'liveSecretProvided',
  'providerMutation',
  'cleanupConfirmed',
] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isSafeIdentifier(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9][a-z0-9-]{0,47}$/.test(value)
}

/** Builds a non-persistent staging smoke contract without starting staging or calling an external service. */
export function createEphemeralStagingProfile(input: unknown): EphemeralStagingProfileResult {
  if (!isRecord(input)) return { ok: false, reason: 'input_invalid' }
  if (Object.keys(input).some(key => !(PROFILE_KEYS as readonly string[]).includes(key))) return { ok: false, reason: 'input_invalid' }
  if (input.environment === 'production') return { ok: false, reason: 'production_forbidden' }
  if (input.liveSecretProvided === true) return { ok: false, reason: 'live_secret_forbidden' }
  if (input.databaseMode !== 'ephemeral' || input.objectStorageMode !== 'ephemeral') return { ok: false, reason: 'persistent_mode_forbidden' }
  if (input.mailMode !== 'sink' || input.recipientDomain !== 'test.invalid') return { ok: false, reason: 'external_delivery_forbidden' }
  if (input.providerMutation !== 'sandbox_only') return { ok: false, reason: 'external_delivery_forbidden' }
  if (!isSafeIdentifier(input.deploymentId) || !isSafeIdentifier(input.namespace)) return { ok: false, reason: 'unsafe_identifier' }
  if (input.cleanupConfirmed !== true) return { ok: false, reason: 'cleanup_required' }
  if (input.environment !== 'staging' || input.liveSecretProvided !== false) return { ok: false, reason: 'input_invalid' }
  return {
    ok: true,
    profile: {
      environment: 'staging',
      deploymentId: input.deploymentId,
      namespace: input.namespace,
      databaseMode: 'ephemeral',
      objectStorageMode: 'ephemeral',
      mailMode: 'sink',
      recipientDomain: 'test.invalid',
      providerMutation: 'sandbox_only',
      outboundNetwork: false,
      productionMutation: false,
      persistentData: false,
      cleanupConfirmed: true,
    },
  }
}
