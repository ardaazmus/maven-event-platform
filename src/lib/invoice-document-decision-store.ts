import type { PrismaClient } from '@prisma/client'

type DecisionClient = Pick<PrismaClient, '$transaction'>

const MATCH_STATUSES = new Set(['matched', 'unmatched', 'conflict'])
const APPROVAL_STATUSES = new Set(['pending', 'approved', 'rejected'])

export type InvoiceDocumentDecisionInput = {
  workspaceId: string
  invoiceDocumentId: string
  invoiceRecordId: string
  matchStatus: 'matched' | 'unmatched' | 'conflict'
  matchStrategy?: string | null
  matchedInvoiceRecordId?: string | null
  approvalStatus: 'pending' | 'approved' | 'rejected'
  approvedById?: string | null
}

export type InvoiceDocumentDecisionResult =
  | { status: 'created'; decisionId: string }
  | { status: 'duplicate'; decisionId: string }
  | { status: 'blocked'; reason: 'input_invalid' | 'scope_mismatch' | 'decision_conflict' }

function required(value: string): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

function sameDecision(existing: { invoiceRecordId: string; matchStatus: string; matchStrategy: string | null; matchedInvoiceRecordId: string | null; approvalStatus: string; approvedById: string | null }, input: InvoiceDocumentDecisionInput): boolean {
  return existing.invoiceRecordId === input.invoiceRecordId && existing.matchStatus === input.matchStatus && existing.matchStrategy === (input.matchStrategy ?? null) && existing.matchedInvoiceRecordId === (input.matchedInvoiceRecordId ?? null) && existing.approvalStatus === input.approvalStatus && existing.approvedById === (input.approvedById ?? null)
}

function isUniqueConstraint(error: unknown): boolean {
  return typeof error === 'object' && error !== null && ((error as { code?: unknown }).code === 'P2002' || (error as { code?: unknown }).code === 'SQLITE_CONSTRAINT_UNIQUE')
}

/** Persists one tenant-scoped decision and rejects replay with changed facts. */
export async function saveInvoiceDocumentDecision(
  input: InvoiceDocumentDecisionInput,
  client: DecisionClient,
): Promise<InvoiceDocumentDecisionResult> {
  if (!required(input.workspaceId) || !required(input.invoiceDocumentId) || !required(input.invoiceRecordId)) return { status: 'blocked', reason: 'input_invalid' }
  if (!MATCH_STATUSES.has(input.matchStatus) || !APPROVAL_STATUSES.has(input.approvalStatus)) return { status: 'blocked', reason: 'input_invalid' }
  if (input.matchStatus === 'matched' && (!required(input.matchedInvoiceRecordId ?? '') || input.matchedInvoiceRecordId !== input.invoiceRecordId)) return { status: 'blocked', reason: 'input_invalid' }
  if (input.approvalStatus === 'approved' && !required(input.approvedById ?? '')) return { status: 'blocked', reason: 'input_invalid' }

  try {
    return await client.$transaction(async tx => {
      const document = await tx.invoiceDocument.findFirst({
        where: {
          id: input.invoiceDocumentId,
          invoiceRecordId: input.invoiceRecordId,
          invoiceRecord: { id: input.invoiceRecordId, workspaceId: input.workspaceId, paymentOrder: { workspaceId: input.workspaceId } },
        },
        select: { id: true },
      })
      if (!document) return { status: 'blocked', reason: 'scope_mismatch' }

      const existing = await tx.invoiceDocumentDecision.findFirst({
        where: { workspaceId: input.workspaceId, invoiceDocumentId: input.invoiceDocumentId },
        select: { id: true, invoiceRecordId: true, matchStatus: true, matchStrategy: true, matchedInvoiceRecordId: true, approvalStatus: true, approvedById: true },
      })
      if (existing) return sameDecision(existing, input) ? { status: 'duplicate', decisionId: existing.id } : { status: 'blocked', reason: 'decision_conflict' }

      const created = await tx.invoiceDocumentDecision.create({
        data: {
          workspaceId: input.workspaceId,
          invoiceDocumentId: input.invoiceDocumentId,
          invoiceRecordId: input.invoiceRecordId,
          matchStatus: input.matchStatus,
          matchStrategy: input.matchStrategy ?? null,
          matchedInvoiceRecordId: input.matchedInvoiceRecordId ?? null,
          approvalStatus: input.approvalStatus,
          approvedById: input.approvedById ?? null,
        },
        select: { id: true },
      })
      return { status: 'created', decisionId: created.id }
    })
  } catch (error) {
    if (!isUniqueConstraint(error)) throw error
    const raced = await client.$transaction(async tx => tx.invoiceDocumentDecision.findFirst({
      where: { workspaceId: input.workspaceId, invoiceDocumentId: input.invoiceDocumentId },
      select: { id: true, invoiceRecordId: true, matchStatus: true, matchStrategy: true, matchedInvoiceRecordId: true, approvalStatus: true, approvedById: true },
    }))
    if (!raced) return { status: 'blocked', reason: 'decision_conflict' }
    return sameDecision(raced, input) ? { status: 'duplicate', decisionId: raced.id } : { status: 'blocked', reason: 'decision_conflict' }
  }
}
