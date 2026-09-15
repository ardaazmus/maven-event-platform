export const CREDENTIAL_METHODS = Object.freeze(['oauth_pkce', 'api_key', 'certificate', 'manual_secret'] as const)
export type CredentialMethod = (typeof CREDENTIAL_METHODS)[number]

export type CredentialMethodDescriptor = Readonly<{
  connectionId: string
  method: CredentialMethod
  keyId: string
  envelopeVersion: string
  display: 'masked'
  inputBoundary: 'server'
  requiresVerification: true
}> 

export type CredentialMethodResult =
  | { ok: true; descriptor: CredentialMethodDescriptor }
  | { ok: false; reason: 'input_invalid' | 'secret_forbidden' | 'connection_mismatch' | 'method_invalid' | 'key_id_invalid' | 'version_invalid' }

const SAFE_ID_PATTERN = /^[A-Za-z0-9._-]{1,120}$/
const KEY_ID_PATTERN = /^[A-Za-z0-9._-]{1,32}$/
const VERSION_PATTERN = /^v[1-9][0-9]{0,2}$/
const SECRET_KEYS = new Set(['secret', 'token', 'apiKey', 'api_key', 'password', 'privateKey', 'private_key', 'certificate', 'certificatePem', 'pem', 'credentials', 'credentialsEnvelope'])
const ALLOWED_KEYS = new Set(['connectionId', 'method', 'keyId', 'envelopeVersion'])

function text(value: unknown, pattern: RegExp) {
  return typeof value === 'string' && pattern.test(value.trim()) ? value.trim() : null
}

/** Normalizes only the safe descriptor consumed by UI and connection gates. */
export function normalizeCredentialMethod(input: unknown, expectedConnectionId?: string): CredentialMethodResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, reason: 'input_invalid' }
  const value = input as Record<string, unknown>
  if (Object.keys(value).some(key => SECRET_KEYS.has(key))) return { ok: false, reason: 'secret_forbidden' }
  if (Object.keys(value).some(key => !ALLOWED_KEYS.has(key))) return { ok: false, reason: 'input_invalid' }
  const connectionId = text(value.connectionId, SAFE_ID_PATTERN)
  const keyId = text(value.keyId, KEY_ID_PATTERN)
  const envelopeVersion = text(value.envelopeVersion, VERSION_PATTERN)
  if (!connectionId) return { ok: false, reason: 'input_invalid' }
  if (expectedConnectionId !== undefined && connectionId !== expectedConnectionId) return { ok: false, reason: 'connection_mismatch' }
  if (!keyId) return { ok: false, reason: 'key_id_invalid' }
  if (!envelopeVersion) return { ok: false, reason: 'version_invalid' }
  if (!(CREDENTIAL_METHODS as readonly unknown[]).includes(value.method)) return { ok: false, reason: 'method_invalid' }
  return {
    ok: true,
    descriptor: {
      connectionId,
      method: value.method as CredentialMethod,
      keyId,
      envelopeVersion,
      display: 'masked',
      inputBoundary: 'server',
      requiresVerification: true,
    },
  }
}

/** Exposes setup requirements without exposing the method's secret material. */
export function credentialMethodRequirements(method: CredentialMethod) {
  if (method === 'oauth_pkce') return { method, inputBoundary: 'server' as const, requiresVerification: true as const, uiLabel: 'OAuth PKCE' }
  if (method === 'api_key') return { method, inputBoundary: 'server' as const, requiresVerification: true as const, uiLabel: 'API anahtarı' }
  if (method === 'certificate') return { method, inputBoundary: 'server' as const, requiresVerification: true as const, uiLabel: 'Sertifika' }
  return { method, inputBoundary: 'server' as const, requiresVerification: true as const, uiLabel: 'Manuel credential' }
}
