import type { PrismaClient } from '@prisma/client'
import { saveInvoiceDocumentDecision, type InvoiceDocumentDecisionInput, type InvoiceDocumentDecisionResult } from '@/lib/invoice-document-decision-store'
import type { InvoiceMatchStrategy } from '@/lib/invoice-matching'

type DecisionApprovalClient = Pick<PrismaClient, 'invoiceDocument' | 'invoiceRecord'>
type DecisionSaver = (input: InvoiceDocumentDecisionInput, client: PrismaClient) => Promise<InvoiceDocumentDecisionResult>

const MATCH_STRATEGIES = new Set<InvoiceMatchStrategy>(['row_id', 'payment_reference', 'provider_invoice_id', 'invoice_uuid', 'invoice_number'])

export type InvoiceDocumentDecisionApprovalInput = {
  workspaceId: string
  invoiceDocumentId: string
  invoiceRecordId: string
  candidateId: string
  strategy: InvoiceMatchStrategy
  approvalStatus: 'approved' | 'rejected'
  approvedById: string
}

export type InvoiceDocumentDecisionApprovalResult = InvoiceDocumentDecisionResult | { status: 'blocked'; reason: 'input_invalid' | 'scope_mismatch' }

function required(value: string): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

/** Rechecks private invoice scope before creating the durable approval fence. */
export async function approveInvoiceDocumentDecision(
  input: InvoiceDocumentDecisionApprovalInput,
  client: DecisionApprovalClient,
  save: DecisionSaver,
): Promise<InvoiceDocumentDecisionApprovalResult> {
  if (!required(input.workspaceId) || !required(input.invoiceDocumentId) || !required(input.invoiceRecordId) || !required(input.candidateId) || !required(input.approvedById) || !MATCH_STRATEGIES.has(input.strategy)) return { status: 'blocked', reason: 'input_invalid' }
  if (input.candidateId !== input.invoiceRecordId) return { status: 'blocked', reason: 'scope_mismatch' }

  const document = await client.invoiceDocument.findFirst({
    where: { id: input.invoiceDocumentId, invoiceRecordId: input.invoiceRecordId, invoiceRecord: { id: input.invoiceRecordId, workspaceId: input.workspaceId, paymentOrder: { workspaceId: input.workspaceId } } },
    select: { id: true },
  })
  const candidate = await client.invoiceRecord.findFirst({
    where: { id: input.candidateId, workspaceId: input.workspaceId, paymentOrder: { workspaceId: input.workspaceId } },
    select: { id: true },
  })
  if (!document || !candidate) return { status: 'blocked', reason: 'scope_mismatch' }

  return save({
    workspaceId: input.workspaceId,
    invoiceDocumentId: input.invoiceDocumentId,
    invoiceRecordId: input.invoiceRecordId,
    matchStatus: 'matched',
    matchStrategy: input.strategy,
    matchedInvoiceRecordId: input.candidateId,
    approvalStatus: input.approvalStatus,
    approvedById: input.approvedById,
  }, client as PrismaClient)
}
