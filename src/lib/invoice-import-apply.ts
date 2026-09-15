import { createHash } from 'node:crypto'
import type { InvoiceImportPreview, InvoiceImportPreviewRow } from '@/lib/invoice-import-preview'

type ApplyablePreviewRow = Extract<InvoiceImportPreviewRow, { status: 'new' | 'update' | 'duplicate' }>

type ExistingApplication = {
  id: string
  status: string
  candidateId: string
}

export type InvoiceImportApplyTransaction = {
  invoiceImportApplication: {
    findUnique(args: { where: { workspaceId_idempotencyKey: { workspaceId: string; idempotencyKey: string } } }): Promise<ExistingApplication | null>
    create(args: { data: { workspaceId: string; importBatchId: string; rowNumber: number; approvedById: string; idempotencyKey: string; candidateId: string; status: string; resultCode: string } }): Promise<{ id: string }>
  }
  auditLog?: {
    create(args: { data: { workspaceId: string; actorId: string; action: string; resourceType: string; resourceId: string; beforeJson: null; afterJson: string } }): Promise<unknown>
  }
}

export type InvoiceImportApplyDatabase = {
  $transaction<T>(callback: (tx: InvoiceImportApplyTransaction) => Promise<T>): Promise<T>
}

type AppliedRowResult =
  | { rowNumber: number; status: 'applied' | 'duplicate'; candidateId: string }
  | { rowNumber: number; status: 'failed'; reason: 'apply_failed' }

export type InvoiceImportApplyResult =
  | { status: 'applied' | 'partial' | 'failed'; rows: AppliedRowResult[] }
  | { status: 'blocked'; reason: 'approval_required' | 'preview_not_applyable' | 'input_invalid'; rows: [] }

function safeIdentifier(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 255 && !/[\u0000-\u001F\u007F]/.test(value)
}

function idempotencyKey(workspaceId: string, batchId: string, rowNumber: number): string {
  const digest = createHash('sha256').update([workspaceId, batchId, rowNumber].join('\u001f'), 'utf8').digest('hex')
  return `invoice_import_${digest}`
}

function isApplyableRow(row: InvoiceImportPreviewRow): row is ApplyablePreviewRow {
  return (row.status === 'new' || row.status === 'update' || row.status === 'duplicate') && safeIdentifier(row.candidateId) && safeIdentifier(row.strategy)
}

function validRows(rows: readonly InvoiceImportPreviewRow[]): rows is ApplyablePreviewRow[] {
  if (!Array.isArray(rows) || rows.length === 0) return false
  const rowNumbers = new Set<number>()
  for (const row of rows) {
    if (!isApplyableRow(row) || !Number.isSafeInteger(row.rowNumber) || row.rowNumber <= 0 || rowNumbers.has(row.rowNumber)) return false
    rowNumbers.add(row.rowNumber)
  }
  return true
}

/**
 * Applies only an approved, applyable dry-run one row per transaction. The
 * caller performs the actual invoice mutation inside the same transaction;
 * this service records the replay fence before returning success and never
 * creates delivery/email work itself.
 */
export async function applyInvoiceImport(
  input: { workspaceId: string; batchId: string; approvedById: string; preview: InvoiceImportPreview },
  db: InvoiceImportApplyDatabase,
  applyRow: (tx: InvoiceImportApplyTransaction, row: ApplyablePreviewRow) => Promise<{ invoiceRecordId: string }>,
): Promise<InvoiceImportApplyResult> {
  if (!safeIdentifier(input?.workspaceId) || !safeIdentifier(input?.batchId) || !safeIdentifier(input?.approvedById)) {
    return { status: 'blocked', reason: 'input_invalid', rows: [] }
  }
  if (!input.preview?.canApply) return { status: 'blocked', reason: 'preview_not_applyable', rows: [] }
  if (!validRows(input.preview.rows)) return { status: 'blocked', reason: 'preview_not_applyable', rows: [] }

  const rows: AppliedRowResult[] = []
  for (const row of [...input.preview.rows].sort((left, right) => left.rowNumber - right.rowNumber)) {
    const key = idempotencyKey(input.workspaceId, input.batchId, row.rowNumber)
    try {
      const result = await db.$transaction(async tx => {
        const existing = await tx.invoiceImportApplication.findUnique({ where: { workspaceId_idempotencyKey: { workspaceId: input.workspaceId, idempotencyKey: key } } })
        if (existing) return { status: 'duplicate' as const, candidateId: existing.candidateId }

        if (row.status === 'duplicate') {
          const application = await tx.invoiceImportApplication.create({
            data: {
              workspaceId: input.workspaceId,
              importBatchId: input.batchId,
              rowNumber: row.rowNumber,
              approvedById: input.approvedById,
              idempotencyKey: key,
              candidateId: row.candidateId,
              status: 'duplicate',
              resultCode: 'already_current',
            },
          })
          if (tx.auditLog) await tx.auditLog.create({ data: { workspaceId: input.workspaceId, actorId: input.approvedById, action: 'invoice.import.apply', resourceType: 'invoice_import_application', resourceId: application.id, beforeJson: null, afterJson: JSON.stringify({ batchId: input.batchId, rowNumber: row.rowNumber, status: 'duplicate' }) } })
          return { status: 'duplicate' as const, candidateId: row.candidateId }
        }

        const applied = await applyRow(tx, row)
        if (!safeIdentifier(applied?.invoiceRecordId)) throw new Error('invoice_record_invalid')
        const application = await tx.invoiceImportApplication.create({
          data: {
            workspaceId: input.workspaceId,
            importBatchId: input.batchId,
            rowNumber: row.rowNumber,
            approvedById: input.approvedById,
            idempotencyKey: key,
            candidateId: row.candidateId,
            status: 'applied',
            resultCode: row.status,
          },
        })
        if (tx.auditLog) await tx.auditLog.create({ data: { workspaceId: input.workspaceId, actorId: input.approvedById, action: 'invoice.import.apply', resourceType: 'invoice_import_application', resourceId: application.id, beforeJson: null, afterJson: JSON.stringify({ batchId: input.batchId, rowNumber: row.rowNumber, status: 'applied' }) } })
        return { status: 'applied' as const, candidateId: row.candidateId }
      })
      rows.push({ rowNumber: row.rowNumber, status: result.status, candidateId: result.candidateId })
    } catch {
      rows.push({ rowNumber: row.rowNumber, status: 'failed', reason: 'apply_failed' })
    }
  }

  const failed = rows.some(row => row.status === 'failed')
  const successful = rows.some(row => row.status === 'applied' || row.status === 'duplicate')
  return { status: failed ? successful ? 'partial' : 'failed' : 'applied', rows }
}
