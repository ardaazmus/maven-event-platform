export const EXTERNAL_EVIDENCE_ENVIRONMENTS = Object.freeze(['sandbox', 'staging', 'production'] as const)
export const EXTERNAL_EVIDENCE_SCOPES = Object.freeze(['payment', 'invoice', 'parasut', 'document', 'email', 'deployment'] as const)
export const EXTERNAL_EVIDENCE_CLASSES = Object.freeze(['E0', 'E1', 'E2', 'E3', 'E4', 'E5', 'E6'] as const)
export const EXTERNAL_EVIDENCE_STATUSES = Object.freeze(['verified', 'unknown', 'unsupported', 'blocked', 'expired'] as const)
export const EXTERNAL_EVIDENCE_DECISIONS = Object.freeze(['PASS', 'FAIL', 'EXTERNAL_DEPENDENCY', 'LEGAL_REVIEW_REQUIRED', 'UNVERIFIED'] as const)

export type ExternalEvidenceEnvironment = (typeof EXTERNAL_EVIDENCE_ENVIRONMENTS)[number]
export type ExternalEvidenceScope = (typeof EXTERNAL_EVIDENCE_SCOPES)[number]
export type ExternalEvidenceClass = (typeof EXTERNAL_EVIDENCE_CLASSES)[number]
export type ExternalEvidenceStatus = (typeof EXTERNAL_EVIDENCE_STATUSES)[number]
export type ExternalEvidenceDecision = (typeof EXTERNAL_EVIDENCE_DECISIONS)[number]

export type ExternalEvidenceRecord = Readonly<{
  evidenceId: string
  ownerId: string
  systemId: string
  environment: ExternalEvidenceEnvironment
  scope: ExternalEvidenceScope
  evidenceClass: ExternalEvidenceClass
  status: ExternalEvidenceStatus
  expiresAtMs: number | null
  lastVerifiedAtMs: number
  inputReference: string
  artifactSha256: string | null
  decision: ExternalEvidenceDecision
}>

export type ExternalEvidenceIntakeResult =
  | { ok: true; record: ExternalEvidenceRecord }
  | { ok: false; reason: 'input_invalid' | 'sensitive_metadata_not_allowed' }

export type ExternalEvidenceFreshnessResult =
  | {
      ok: true
      freshness: 'usable'
      evidenceId: string
      scope: ExternalEvidenceScope
      evidenceClass: ExternalEvidenceClass
      expiresAtMs: number
      decision: 'PASS'
    }
  | {
      ok: false
      reason: 'input_invalid' | 'not_verified' | 'decision_not_pass' | 'expiry_missing' | 'evidence_expired' | 'artifact_hash_required'
    }

const IDENTIFIER_PATTERN = /^[A-Za-z0-9_-]{1,128}$/
const SHA256_PATTERN = /^[a-f0-9]{64}$/
const INTAKE_KEYS = [
  'evidenceId',
  'ownerId',
  'systemId',
  'environment',
  'scope',
  'evidenceClass',
  'status',
  'expiresAtMs',
  'lastVerifiedAtMs',
  'inputReference',
  'artifactSha256',
  'decision',
] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).every(key => keys.includes(key))
}

function isIdentifier(value: unknown): value is string {
  return typeof value === 'string' && IDENTIFIER_PATTERN.test(value)
}

function isSafeTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function isAllowed<T extends readonly string[]>(values: T, value: unknown): value is T[number] {
  return typeof value === 'string' && values.includes(value as T[number])
}

function isSha256(value: unknown): value is string {
  return typeof value === 'string' && SHA256_PATTERN.test(value)
}

function isNormalizedEvidence(value: unknown): value is ExternalEvidenceRecord {
  if (!isRecord(value) || !hasOnlyKeys(value, INTAKE_KEYS)) return false
  if (!isIdentifier(value.evidenceId) || !isIdentifier(value.ownerId) || !isIdentifier(value.systemId) || !isIdentifier(value.inputReference)) return false
  if (!isAllowed(EXTERNAL_EVIDENCE_ENVIRONMENTS, value.environment)) return false
  if (!isAllowed(EXTERNAL_EVIDENCE_SCOPES, value.scope)) return false
  if (!isAllowed(EXTERNAL_EVIDENCE_CLASSES, value.evidenceClass)) return false
  if (!isAllowed(EXTERNAL_EVIDENCE_STATUSES, value.status)) return false
  if (!isAllowed(EXTERNAL_EVIDENCE_DECISIONS, value.decision)) return false
  if (value.expiresAtMs !== null && !isSafeTimestamp(value.expiresAtMs)) return false
  if (!isSafeTimestamp(value.lastVerifiedAtMs)) return false
  if (value.artifactSha256 !== null && !isSha256(value.artifactSha256)) return false
  return value.expiresAtMs === null || value.expiresAtMs > value.lastVerifiedAtMs
}

/** Normalizes bounded, redacted metadata supplied by an external evidence process. */
export function normalizeExternalEvidence(input: unknown): ExternalEvidenceIntakeResult {
  if (!isRecord(input)) return { ok: false, reason: 'input_invalid' }
  if (!hasOnlyKeys(input, INTAKE_KEYS)) return { ok: false, reason: 'sensitive_metadata_not_allowed' }
  if (!isNormalizedEvidence(input)) return { ok: false, reason: 'input_invalid' }

  return {
    ok: true,
    record: Object.freeze({
      evidenceId: input.evidenceId,
      ownerId: input.ownerId,
      systemId: input.systemId,
      environment: input.environment,
      scope: input.scope,
      evidenceClass: input.evidenceClass,
      status: input.status,
      expiresAtMs: input.expiresAtMs,
      lastVerifiedAtMs: input.lastVerifiedAtMs,
      inputReference: input.inputReference,
      artifactSha256: input.artifactSha256,
      decision: input.decision,
    }),
  }
}

/** Applies freshness and hash requirements without opening provider or production mutation. */
export function evaluateExternalEvidenceFreshness(input: unknown): ExternalEvidenceFreshnessResult {
  if (!isRecord(input) || !hasOnlyKeys(input, ['record', 'nowMs']) || !isSafeTimestamp(input.nowMs)) return { ok: false, reason: 'input_invalid' }
  if (!isNormalizedEvidence(input.record) || input.record.lastVerifiedAtMs > input.nowMs) return { ok: false, reason: 'input_invalid' }
  if (input.record.status !== 'verified') return { ok: false, reason: 'not_verified' }
  if (input.record.decision !== 'PASS') return { ok: false, reason: 'decision_not_pass' }
  if (input.record.artifactSha256 === null) return { ok: false, reason: 'artifact_hash_required' }
  if (input.record.expiresAtMs === null) return { ok: false, reason: 'expiry_missing' }
  if (input.record.expiresAtMs <= input.nowMs) return { ok: false, reason: 'evidence_expired' }

  return {
    ok: true,
    freshness: 'usable',
    evidenceId: input.record.evidenceId,
    scope: input.record.scope,
    evidenceClass: input.record.evidenceClass,
    expiresAtMs: input.record.expiresAtMs,
    decision: 'PASS',
  }
}
