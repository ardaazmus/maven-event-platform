import type { Prisma, PrismaClient } from '@prisma/client'

export const invoiceCenterSelect = {
  id: true,
  provider: true,
  documentType: true,
  amountMinor: true,
  currency: true,
  state: true,
  providerInvoiceId: true,
  invoiceNumber: true,
  invoiceUuid: true,
  createdAt: true,
  updatedAt: true,
  paymentOrder: {
    select: {
      id: true,
      formId: true,
      provider: true,
      mode: true,
      status: true,
      amountMinor: true,
      currency: true,
      form: { select: { id: true, title: true, slug: true, status: true, publishedVersionId: true } },
      submission: { select: { id: true, status: true, source: true, submittedAt: true } },
    },
  },
  documents: {
    select: { id: true, artifactKind: true, state: true, scanStatus: true, visibility: true, readyAt: true, createdAt: true },
    orderBy: { createdAt: 'asc' as const },
  },
  deliveries: {
    select: { id: true, documentId: true, channel: true, status: true, provider: true, attemptCount: true, sentAt: true, createdAt: true },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.InvoiceRecordSelect

export type InvoiceCenterRecord = Prisma.InvoiceRecordGetPayload<{ select: typeof invoiceCenterSelect }>

export type InvoiceCenterItem = {
  form: { id: string; title: string; slug: string; status: string; publishedVersionId: string | null }
  submission: { id: string; status: string; source: string; submittedAt: Date } | null
  payment: { id: string; provider: string; mode: string; status: string; amountMinor: number; currency: string }
  invoice: { id: string; provider: string; documentType: string; amountMinor: number; currency: string; state: string; providerInvoiceId: string | null; invoiceNumber: string | null; invoiceUuid: string | null; createdAt: Date; updatedAt: Date }
  documents: Array<{ id: string; artifactKind: string; state: string; scanStatus: string; visibility: string; readyAt: Date | null; createdAt: Date }>
  deliveries: Array<{ id: string; documentId: string | null; channel: string; status: string; provider: string | null; attemptCount: number; sentAt: Date | null; createdAt: Date }>
}

/** Builds a tenant-safe invoice center item without recipient PII or provider payloads. */
export function toInvoiceCenterItem(record: InvoiceCenterRecord): InvoiceCenterItem {
  return {
    form: record.paymentOrder.form,
    submission: record.paymentOrder.submission,
    payment: {
      id: record.paymentOrder.id,
      provider: record.paymentOrder.provider,
      mode: record.paymentOrder.mode,
      status: record.paymentOrder.status,
      amountMinor: record.paymentOrder.amountMinor,
      currency: record.paymentOrder.currency,
    },
    invoice: {
      id: record.id,
      provider: record.provider,
      documentType: record.documentType,
      amountMinor: record.amountMinor,
      currency: record.currency,
      state: record.state,
      providerInvoiceId: record.providerInvoiceId,
      invoiceNumber: record.invoiceNumber,
      invoiceUuid: record.invoiceUuid,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    },
    documents: record.documents,
    deliveries: record.deliveries,
  }
}

export type InvoiceCenterQuery = Pick<PrismaClient, 'invoiceRecord'>

/** Lists a bounded, workspace-scoped invoice center read model with stable cursor pagination. */
export async function listInvoiceCenter(input: { db: InvoiceCenterQuery; workspaceId: string; limit: number; cursor?: string; query?: string; formId?: string; state?: string }) {
  const where: Prisma.InvoiceRecordWhereInput = {
    workspaceId: input.workspaceId,
    ...(input.formId ? { paymentOrder: { formId: input.formId, workspaceId: input.workspaceId } } : { paymentOrder: { workspaceId: input.workspaceId } }),
    ...(input.state ? { state: input.state } : {}),
    ...(input.query ? { OR: [{ invoiceNumber: { contains: input.query } }, { providerInvoiceId: { contains: input.query } }, { paymentOrder: { form: { title: { contains: input.query } }, workspaceId: input.workspaceId } }] } : {}),
  }
  const rows = await input.db.invoiceRecord.findMany({
    where,
    select: invoiceCenterSelect,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    take: input.limit + 1,
  })
  const hasMore = rows.length > input.limit
  const visibleRows = hasMore ? rows.slice(0, input.limit) : rows
  return { data: visibleRows.map(toInvoiceCenterItem), nextCursor: hasMore ? visibleRows.at(-1)?.id ?? null : null }
}
