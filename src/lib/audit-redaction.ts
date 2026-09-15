const SAFE_METADATA_KEYS = new Set([
  'accountingAction',
  'artifactKind',
  'batchId',
  'channel',
  'count',
  'deliveryAction',
  'eventKind',
  'formatVersion',
  'invoiceRecordId',
  'invoiceState',
  'invoiceId',
  'documentId',
  'providerDocumentId',
  'mode',
  'paymentStatus',
  'rowNumber',
  'scanStatus',
  'selectionSnapshotHash',
  'sha256',
  'size',
  'source',
  'state',
  'status',
  'readyAt',
])

const MAX_DEPTH = 3
const MAX_KEYS = 32
const MAX_ARRAY_ITEMS = 16
const MAX_STRING_LENGTH = 160

function redactValue(value: unknown, depth: number): unknown {
  if (value === null || typeof value === 'number' || typeof value === 'boolean') return value
  if (typeof value === 'string') return value.slice(0, MAX_STRING_LENGTH)
  if (depth >= MAX_DEPTH || !value || typeof value !== 'object') return '[redacted]'
  if (Array.isArray(value)) return value.slice(0, MAX_ARRAY_ITEMS).map(item => redactValue(item, depth + 1))
  return Object.fromEntries(Object.entries(value).slice(0, MAX_KEYS).flatMap(([key, child]) => {
    if (!SAFE_METADATA_KEYS.has(key)) return []
    return [[key, redactValue(child, depth + 1)]]
  }))
}

/** Parses audit metadata without exposing arbitrary JSON or breaking the audit screen on legacy rows. */
export function redactAuditJson(rawJson: string | null): Record<string, unknown> | null {
  if (!rawJson) return null
  try {
    const value: unknown = JSON.parse(rawJson)
    const redacted = redactValue(value, 0)
    return redacted && typeof redacted === 'object' && !Array.isArray(redacted) ? redacted as Record<string, unknown> : { redacted: true }
  } catch {
    return { redacted: true, reason: 'invalid_json' }
  }
}
