const SAFE_ID_PATTERN = /^[A-Za-z0-9._:-]{1,120}$/
const SAFE_METADATA_KEYS = new Set([
  'artifactKind',
  'batchId',
  'capability',
  'connectionId',
  'count',
  'environment',
  'evidenceClass',
  'formatVersion',
  'invoiceId',
  'documentId',
  'provider',
  'reason',
  'sha256',
  'size',
  'status',
])
const ALLOWED_KEYS = new Set(['action', 'resourceType', 'resourceId', 'workspaceId', 'outcome', 'metadata'])
const SECRET_KEY_PATTERN = /(?:secret|token|password|api[_-]?key|credential|authorization|cookie|private[_-]?key|client[_-]?secret|raw|payload|provider[_-]?response|email|e[-_ ]?posta|phone|telefon|address|adres|name|isim|soyad)/iu

export type SecretSafeAuditResult =
  | { ok: true; event: Readonly<{ action: string; resourceType: string; resourceId: string; workspaceId: string; outcome: string; metadata: Readonly<Record<string, string | number | boolean>> }> }
  | { ok: false; reason: 'input_invalid' | 'secret_forbidden' | 'metadata_key_invalid' | 'metadata_value_invalid' }

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function containsSecretLikeKey(value: unknown, seen = new Set<object>()): boolean {
  if (!value || typeof value !== 'object') return false
  if (seen.has(value)) return false
  seen.add(value)
  if (Array.isArray(value)) return value.some(item => containsSecretLikeKey(item, seen))
  return Object.entries(value).some(([key, child]) => SECRET_KEY_PATTERN.test(key) || containsSecretLikeKey(child, seen))
}

function boundedText(value: unknown): string | null {
  return typeof value === 'string' && SAFE_ID_PATTERN.test(value.trim()) ? value.trim() : null
}

function safeMetadata(value: unknown): Readonly<Record<string, string | number | boolean>> | null | 'key' | 'value' {
  if (value === undefined) return {}
  if (!isPlainRecord(value)) return null
  const entries: Array<[string, string | number | boolean]> = []
  for (const [key, child] of Object.entries(value)) {
    if (!SAFE_METADATA_KEYS.has(key) || SECRET_KEY_PATTERN.test(key)) return 'key'
    if (typeof child === 'string') {
      if (child.length > 160 || !/^[A-Za-z0-9._:/ -]*$/u.test(child)) return 'value'
      entries.push([key, child])
      continue
    }
    if (typeof child === 'boolean') {
      entries.push([key, child])
      continue
    }
    if (typeof child === 'number' && Number.isSafeInteger(child) && child >= 0) {
      entries.push([key, child])
      continue
    }
    return 'value'
  }
  return Object.fromEntries(entries)
}

/** Builds bounded audit metadata and rejects sensitive material before response/log/export boundaries. */
export function normalizeSecretSafeAuditEvent(input: unknown): SecretSafeAuditResult {
  if (!isPlainRecord(input)) return { ok: false, reason: 'input_invalid' }
  if (containsSecretLikeKey(input)) return { ok: false, reason: 'secret_forbidden' }
  if (Object.keys(input).some(key => !ALLOWED_KEYS.has(key))) return { ok: false, reason: 'input_invalid' }
  const action = boundedText(input.action)
  const resourceType = boundedText(input.resourceType)
  const resourceId = boundedText(input.resourceId)
  const workspaceId = boundedText(input.workspaceId)
  const outcome = boundedText(input.outcome)
  if (!action || !resourceType || !resourceId || !workspaceId || !outcome) return { ok: false, reason: 'input_invalid' }
  const metadata = safeMetadata(input.metadata)
  if (metadata === 'key') return { ok: false, reason: 'metadata_key_invalid' }
  if (metadata === 'value' || metadata === null) return { ok: false, reason: 'metadata_value_invalid' }
  return { ok: true, event: { action, resourceType, resourceId, workspaceId, outcome, metadata } }
}
