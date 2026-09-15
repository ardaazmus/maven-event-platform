import type { InvoiceCandidate } from '@/lib/invoice-candidates'

type InvoiceBatchSelectionInput = {
  candidates: readonly InvoiceCandidate[]
  selectedPaymentOrderIds: readonly string[]
  workspaceId: string
  formId: string
}

export type InvoiceBatchFilter = {
  formIds?: readonly string[]
  currencies?: readonly string[]
  statuses?: readonly string[]
  createdFrom?: string | null
  createdTo?: string | null
}

type InvoiceBatchSelectionResult =
  | { ok: true; rows: Array<{ rowNumber: number; paymentOrderIdSnapshot: string }> }
  | { ok: false; reason: 'input_invalid' | 'selection_empty' | 'selection_duplicate' | 'candidate_not_found' | 'scope_mismatch' | 'candidate_pool_invalid' }

type InvoiceBatchFilterResult =
  | {
      ok: true
      filterSnapshot: { formIds: string[]; currencies: string[]; statuses: string[]; createdFrom: string | null; createdTo: string | null }
      rows: Array<{ rowNumber: number; paymentOrderIdSnapshot: string }>
      totalCount: number
      totalAmountMinor: number
    }
  | { ok: false; reason: 'input_invalid' | 'filter_invalid' | 'candidate_pool_invalid' }

type NormalizedInvoiceBatchFilter = {
  formIds: string[]
  currencies: string[]
  statuses: string[]
  createdFrom: string | null
  createdTo: string | null
}

function boundedId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 255
}

/**
 * Creates a deterministic ID-only batch snapshot after rechecking tenant and
 * form scope. It deliberately does not accept raw spreadsheet or PII values.
 */
export function selectInvoiceBatchRows(input: InvoiceBatchSelectionInput): InvoiceBatchSelectionResult {
  if (!boundedId(input.workspaceId) || !boundedId(input.formId) || !Array.isArray(input.selectedPaymentOrderIds)) {
    return { ok: false, reason: 'input_invalid' }
  }
  if (input.selectedPaymentOrderIds.length === 0) return { ok: false, reason: 'selection_empty' }

  const selected = new Set<string>()
  for (const id of input.selectedPaymentOrderIds) {
    if (!boundedId(id)) return { ok: false, reason: 'input_invalid' }
    if (selected.has(id)) return { ok: false, reason: 'selection_duplicate' }
    selected.add(id)
  }

  const candidateById = new Map<string, InvoiceCandidate>()
  for (const candidate of input.candidates) {
    if (!boundedId(candidate.id) || candidateById.has(candidate.id)) {
      return { ok: false, reason: 'candidate_pool_invalid' }
    }
    candidateById.set(candidate.id, candidate)
  }

  const rows: Array<{ rowNumber: number; paymentOrderIdSnapshot: string }> = []
  for (const [index, id] of input.selectedPaymentOrderIds.entries()) {
    const candidate = candidateById.get(id)
    if (!candidate) return { ok: false, reason: 'candidate_not_found' }
    if (candidate.workspaceId !== input.workspaceId || candidate.formId !== input.formId) {
      return { ok: false, reason: 'scope_mismatch' }
    }
    rows.push({ rowNumber: index + 1, paymentOrderIdSnapshot: candidate.id })
  }

  return { ok: true, rows }
}

const FILTER_KEYS = new Set(['formIds', 'currencies', 'statuses', 'createdFrom', 'createdTo'])
const ALLOWED_STATUSES = new Set(['succeeded', 'processing', 'failed', 'canceled', 'refunded', 'partially_refunded', 'disputed'])

function normalizeFilter(filter: InvoiceBatchFilter): NormalizedInvoiceBatchFilter {
  if (!filter || typeof filter !== 'object' || Object.keys(filter as object).some(key => !FILTER_KEYS.has(key))) {
    throw new Error('filter_invalid')
  }

  const normalizeIds = (values: readonly string[] | undefined): string[] => {
    if (values === undefined) return []
    if (!Array.isArray(values)) throw new Error('filter_invalid')
    const normalized = values.map(value => {
      if (!boundedId(value)) throw new Error('filter_invalid')
      return value
    })
    if (new Set(normalized).size !== normalized.length) throw new Error('filter_invalid')
    return [...normalized].sort()
  }

  const formIds = normalizeIds(filter.formIds)
  const currencies = normalizeIds(filter.currencies).map(value => value.toUpperCase())
  if (currencies.some(value => !/^[A-Z]{3}$/.test(value)) || new Set(currencies).size !== currencies.length) {
    throw new Error('filter_invalid')
  }

  const statuses = normalizeIds(filter.statuses)
  if (statuses.some(value => !ALLOWED_STATUSES.has(value))) throw new Error('filter_invalid')

  const normalizeDate = (value: string | null | undefined): string | null => {
    if (value === undefined || value === null) return null
    const timestamp = Date.parse(value)
    if (Number.isNaN(timestamp)) throw new Error('filter_invalid')
    return new Date(timestamp).toISOString()
  }
  const createdFrom = normalizeDate(filter.createdFrom)
  const createdTo = normalizeDate(filter.createdTo)
  if (createdFrom && createdTo && createdFrom > createdTo) throw new Error('filter_invalid')

  return { formIds, currencies, statuses, createdFrom, createdTo }
}

/**
 * Applies a normalized, reproducible filter to X-00 candidates and returns
 * immutable batch metadata plus an exact minor-unit count/total.
 */
export function selectInvoiceBatchByFilter(input: {
  candidates: readonly (InvoiceCandidate & { status: string; createdAt: string })[]
  workspaceId: string
  filter: InvoiceBatchFilter
}): InvoiceBatchFilterResult {
  if (!boundedId(input.workspaceId) || !Array.isArray(input.candidates)) return { ok: false, reason: 'input_invalid' }

  let filterSnapshot: NormalizedInvoiceBatchFilter
  try {
    filterSnapshot = normalizeFilter(input.filter)
  } catch {
    return { ok: false, reason: 'filter_invalid' }
  }

  const matching = input.candidates.filter(candidate => {
    if (candidate.workspaceId !== input.workspaceId) return false
    if (!boundedId(candidate.id) || !boundedId(candidate.formId) || !boundedId(candidate.createdAt) || !Number.isSafeInteger(candidate.amountMinor) || candidate.amountMinor < 0) return false
    if (filterSnapshot.formIds.length > 0 && !filterSnapshot.formIds.includes(candidate.formId)) return false
    if (filterSnapshot.currencies.length > 0 && !filterSnapshot.currencies.includes(candidate.currency)) return false
    if (filterSnapshot.statuses.length > 0 && !filterSnapshot.statuses.includes(candidate.status)) return false
    const createdAt = Date.parse(candidate.createdAt)
    if (Number.isNaN(createdAt)) return false
    if (filterSnapshot.createdFrom && candidate.createdAt < filterSnapshot.createdFrom) return false
    if (filterSnapshot.createdTo && candidate.createdAt > filterSnapshot.createdTo) return false
    return true
  })

  let totalAmountMinor = 0
  for (const candidate of matching) {
    totalAmountMinor += candidate.amountMinor
    if (!Number.isSafeInteger(totalAmountMinor)) return { ok: false, reason: 'candidate_pool_invalid' }
  }

  return {
    ok: true,
    filterSnapshot,
    rows: matching.map((candidate, index) => ({ rowNumber: index + 1, paymentOrderIdSnapshot: candidate.id })),
    totalCount: matching.length,
    totalAmountMinor,
  }
}
