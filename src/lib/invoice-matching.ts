export type InvoiceMatchCandidate = {
  id: string
  workspaceId: string
  formId?: string | null
  rowId?: string | null
  paymentReference?: string | null
  providerInvoiceId?: string | null
  invoiceUuid?: string | null
  invoiceNumber?: string | null
}

export type InvoiceMatchRow = {
  workspaceId: string
  formId?: string | null
  rowId?: string | null
  paymentReference?: string | null
  providerInvoiceId?: string | null
  invoiceUuid?: string | null
  invoiceNumber?: string | null
  invoiceNumberApproved?: boolean
  legalName?: unknown
  email?: unknown
  invoiceDate?: unknown
  amountMinor?: unknown
}

export type InvoiceMatchStrategy = 'row_id' | 'payment_reference' | 'provider_invoice_id' | 'invoice_uuid' | 'invoice_number'

export type InvoiceMatchResult =
  | { status: 'matched'; strategy: InvoiceMatchStrategy; candidateId: string }
  | { status: 'unmatched'; reason: 'no_stable_reference' | 'no_candidate' }
  | { status: 'conflict'; reason: 'ambiguous_reference' | 'scope_mismatch' | 'multiple_references_conflict' }

type ReferenceDefinition = {
  strategy: InvoiceMatchStrategy
  rowKey: keyof InvoiceMatchRow
  candidateKey: keyof InvoiceMatchCandidate
}

const MAX_REFERENCE_LENGTH = 255
const REFERENCES: readonly ReferenceDefinition[] = [
  { strategy: 'row_id', rowKey: 'rowId', candidateKey: 'rowId' },
  { strategy: 'payment_reference', rowKey: 'paymentReference', candidateKey: 'paymentReference' },
  { strategy: 'provider_invoice_id', rowKey: 'providerInvoiceId', candidateKey: 'providerInvoiceId' },
  { strategy: 'invoice_uuid', rowKey: 'invoiceUuid', candidateKey: 'invoiceUuid' },
  { strategy: 'invoice_number', rowKey: 'invoiceNumber', candidateKey: 'invoiceNumber' },
]

function safeIdentifier(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_REFERENCE_LENGTH && !/[\u0000-\u001F\u007F]/.test(value)
}

function normalizeReference(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized.length > 0 && normalized.length <= MAX_REFERENCE_LENGTH && !/[\u0000-\u001F\u007F]/.test(normalized) ? normalized : null
}

function candidateInScope(candidate: InvoiceMatchCandidate, row: InvoiceMatchRow): boolean {
  return candidate.workspaceId === row.workspaceId && (row.formId === undefined || row.formId === null || candidate.formId === row.formId)
}

function candidateReference(candidate: InvoiceMatchCandidate, definition: ReferenceDefinition): string | null {
  return normalizeReference(candidate[definition.candidateKey])
}

function rowReference(row: InvoiceMatchRow, definition: ReferenceDefinition): string | null {
  return normalizeReference(row[definition.rowKey])
}

/**
 * Matches an accounting row only through stable, server-issued references.
 * Names, email addresses, dates and amounts are intentionally ignored.
 */
export function matchInvoiceImportRow(row: InvoiceMatchRow, candidates: readonly InvoiceMatchCandidate[]): InvoiceMatchResult {
  if (!safeIdentifier(row?.workspaceId) || (row.formId !== undefined && row.formId !== null && !safeIdentifier(row.formId)) || !Array.isArray(candidates)) {
    return { status: 'unmatched', reason: 'no_stable_reference' }
  }

  const definitions = REFERENCES.filter(definition => definition.strategy !== 'invoice_number' || row.invoiceNumberApproved === true)
  const references = definitions
    .map(definition => ({ definition, value: rowReference(row, definition) }))
    .filter((entry): entry is { definition: ReferenceDefinition; value: string } => entry.value !== null)
  if (references.length === 0) return { status: 'unmatched', reason: 'no_stable_reference' }

  const validCandidates = candidates.filter(candidate => safeIdentifier(candidate?.id) && safeIdentifier(candidate?.workspaceId))
  const matchesByReference = references.map(reference => ({
    ...reference,
    matches: validCandidates.filter(candidate => candidateReference(candidate, reference.definition) === reference.value),
  }))

  if (matchesByReference.some(reference => reference.matches.some(candidate => !candidateInScope(candidate, row)))) {
    return { status: 'conflict', reason: 'scope_mismatch' }
  }

  const scopedMatches = matchesByReference.map(reference => ({
    ...reference,
    matches: reference.matches.filter(candidate => candidateInScope(candidate, row)),
  }))
  if (scopedMatches.some(reference => reference.matches.length > 1)) {
    return { status: 'conflict', reason: 'ambiguous_reference' }
  }

  const matchedCandidates = scopedMatches.flatMap(reference => reference.matches)
  const uniqueCandidateIds = new Set(matchedCandidates.map(candidate => candidate.id))
  if (uniqueCandidateIds.size > 1) return { status: 'conflict', reason: 'multiple_references_conflict' }
  if (uniqueCandidateIds.size === 0) return { status: 'unmatched', reason: 'no_candidate' }

  const matched = scopedMatches.find(reference => reference.matches.length === 1)
  if (!matched) return { status: 'unmatched', reason: 'no_candidate' }
  return { status: 'matched', strategy: matched.definition.strategy, candidateId: matched.matches[0].id }
}

export const matchInvoiceRow = matchInvoiceImportRow
