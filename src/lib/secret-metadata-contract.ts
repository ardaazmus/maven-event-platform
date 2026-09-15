import { CONNECTION_PURPOSES, type ConnectionPurpose } from '@/lib/connection-purpose-contract'

export const SECRET_LIFECYCLE_STATES = Object.freeze(['active', 'rotating', 'retired', 'revoked'] as const)
export type SecretLifecycleState = (typeof SECRET_LIFECYCLE_STATES)[number]

export type SecretMetadata = Readonly<{
  connectionId: string
  purpose: ConnectionPurpose
  keyId: string
  envelopeVersion: string
  state: SecretLifecycleState
  createdAtMs: number
  rotatedAtMs: number | null
}>

export type SecretMetadataResult =
  | { ok: true; metadata: SecretMetadata }
  | { ok: false; reason: 'input_invalid' | 'secret_value_forbidden' | 'purpose_invalid' | 'key_id_invalid' | 'version_invalid' | 'state_invalid' | 'time_invalid' | 'rotation_time_invalid' | 'connection_mismatch' }

export type SecretRotationIntent = Readonly<{
  connectionId: string
  purpose: ConnectionPurpose
  previousKeyId: string
  nextKeyId: string
  requestedAtMs: number
  requiresReverification: true
  state: 'pending_verification'
}>

export type SecretRotationResult =
  | { ok: true; intent: SecretRotationIntent }
  | { ok: false; reason: 'current_not_active' | 'next_key_id_invalid' | 'same_key_id' | 'time_invalid' }

const SECRET_VALUE_KEYS = ['secret', 'token', 'value', 'plaintext', 'password', 'apiKey', 'api_key', 'clientSecret', 'client_secret']
const KEY_ID_PATTERN = /^[A-Za-z0-9._-]{1,32}$/
const VERSION_PATTERN = /^v[1-9][0-9]{0,2}$/

function text(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

/** Normalizes non-sensitive credential metadata and never accepts secret values. */
export function normalizeSecretMetadata(input: unknown, expectedConnectionId?: string): SecretMetadataResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, reason: 'input_invalid' }
  const value = input as Record<string, unknown>
  if (Object.keys(value).some(key => SECRET_VALUE_KEYS.includes(key))) return { ok: false, reason: 'secret_value_forbidden' }
  const connectionId = text(value.connectionId)
  const keyId = text(value.keyId)
  const envelopeVersion = text(value.envelopeVersion)
  if (!connectionId || !keyId || !envelopeVersion) return { ok: false, reason: 'input_invalid' }
  if (expectedConnectionId !== undefined && connectionId !== expectedConnectionId) return { ok: false, reason: 'connection_mismatch' }
  if (!(CONNECTION_PURPOSES as readonly unknown[]).includes(value.purpose)) return { ok: false, reason: 'purpose_invalid' }
  if (!KEY_ID_PATTERN.test(keyId)) return { ok: false, reason: 'key_id_invalid' }
  if (!VERSION_PATTERN.test(envelopeVersion)) return { ok: false, reason: 'version_invalid' }
  if (!(SECRET_LIFECYCLE_STATES as readonly unknown[]).includes(value.state)) return { ok: false, reason: 'state_invalid' }
  const createdAtMs = value.createdAtMs
  if (typeof createdAtMs !== 'number' || !Number.isSafeInteger(createdAtMs) || createdAtMs < 0) return { ok: false, reason: 'time_invalid' }
  const rotatedAtMs = value.rotatedAtMs === null || value.rotatedAtMs === undefined ? null : value.rotatedAtMs
  if (rotatedAtMs !== null && (typeof rotatedAtMs !== 'number' || !Number.isSafeInteger(rotatedAtMs) || rotatedAtMs < createdAtMs)) return { ok: false, reason: 'rotation_time_invalid' }
  return {
    ok: true,
    metadata: {
      connectionId,
      purpose: value.purpose as ConnectionPurpose,
      keyId,
      envelopeVersion,
      state: value.state as SecretLifecycleState,
      createdAtMs,
      rotatedAtMs: rotatedAtMs as number | null,
    },
  }
}

/** Creates a metadata-only rotation request; verification happens later at the server boundary. */
export function createSecretRotationIntent(input: Readonly<{
  current: SecretMetadata
  nextKeyId: string
  requestedAtMs: number
}>): SecretRotationResult {
  const nextKeyId = text(input.nextKeyId)
  if (!nextKeyId || !KEY_ID_PATTERN.test(nextKeyId)) return { ok: false, reason: 'next_key_id_invalid' }
  if (input.current.state !== 'active') return { ok: false, reason: 'current_not_active' }
  if (nextKeyId === input.current.keyId) return { ok: false, reason: 'same_key_id' }
  if (!Number.isSafeInteger(input.requestedAtMs) || input.requestedAtMs < input.current.createdAtMs) return { ok: false, reason: 'time_invalid' }
  return {
    ok: true,
    intent: {
      connectionId: input.current.connectionId,
      purpose: input.current.purpose,
      previousKeyId: input.current.keyId,
      nextKeyId,
      requestedAtMs: input.requestedAtMs,
      requiresReverification: true,
      state: 'pending_verification',
    },
  }
}
