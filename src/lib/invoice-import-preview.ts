import type { InvoiceMatchResult } from '@/lib/invoice-matching'
import type { InvoiceImportRowValidationError } from '@/lib/invoice-xlsx-import'

export const invoicePreviewStatuses = ['new', 'update', 'duplicate', 'unmatched', 'invalid', 'conflict'] as const
export type InvoicePreviewStatus = (typeof invoicePreviewStatuses)[number]

export type InvoiceImportPreviewInputRow = {
  rowNumber: number
  validationStatus: 'valid' | 'review_required' | 'invalid'
  validationErrors?: readonly InvoiceImportRowValidationError[]
  sourceFingerprint: string
  match: InvoiceMatchResult
}

export type InvoiceImportExistingSnapshot = {
  sourceFingerprint: string | null
}

export type InvoiceImportPreviewRow =
  | { rowNumber: number; status: 'new' | 'update' | 'duplicate'; candidateId: string; strategy: string }
  | { rowNumber: number; status: 'unmatched'; reason: 'no_stable_reference' | 'no_candidate' }
  | { rowNumber: number; status: 'invalid'; reason: 'validation_invalid' | 'validation_review_required' }
  | { rowNumber: number; status: 'conflict'; reason: 'ambiguous_reference' | 'scope_mismatch' | 'multiple_references_conflict' }

export type InvoiceImportPreview = {
  canApply: boolean
  counts: Record<InvoicePreviewStatus, number>
  rows: InvoiceImportPreviewRow[]
}

const emptyCounts = (): Record<InvoicePreviewStatus, number> => ({
  new: 0,
  update: 0,
  duplicate: 0,
  unmatched: 0,
  invalid: 0,
  conflict: 0,
})

function previewRow(input: InvoiceImportPreviewInputRow, existingByCandidateId: Readonly<Record<string, InvoiceImportExistingSnapshot>>): InvoiceImportPreviewRow {
  if (input.validationStatus === 'invalid') return { rowNumber: input.rowNumber, status: 'invalid', reason: 'validation_invalid' }
  if (input.validationStatus === 'review_required') return { rowNumber: input.rowNumber, status: 'invalid', reason: 'validation_review_required' }

  if (input.match.status === 'unmatched') return { rowNumber: input.rowNumber, status: 'unmatched', reason: input.match.reason }
  if (input.match.status === 'conflict') return { rowNumber: input.rowNumber, status: 'conflict', reason: input.match.reason }

  const existing = existingByCandidateId[input.match.candidateId]
  const status = existing && existing.sourceFingerprint === input.sourceFingerprint
    ? 'duplicate'
    : existing
      ? 'update'
      : 'new'
  return { rowNumber: input.rowNumber, status, candidateId: input.match.candidateId, strategy: input.match.strategy }
}

/**
 * Creates a deterministic, read-only import preview. It never writes invoices,
 * changes state, sends email or releases a quarantined file.
 */
export function previewInvoiceImport(input: {
  workspaceId: string
  formId?: string | null
  rows: readonly InvoiceImportPreviewInputRow[]
  existingByCandidateId: Readonly<Record<string, InvoiceImportExistingSnapshot>>
}): InvoiceImportPreview {
  const counts = emptyCounts()
  const rows = [...input.rows].sort((left, right) => left.rowNumber - right.rowNumber).map(row => previewRow(row, input.existingByCandidateId))
  for (const row of rows) counts[row.status] += 1

  return {
    canApply: rows.every(row => row.status === 'new' || row.status === 'update' || row.status === 'duplicate'),
    counts,
    rows,
  }
}
