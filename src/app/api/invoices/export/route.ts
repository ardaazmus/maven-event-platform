import { createHash, randomUUID } from 'node:crypto'
import { z } from 'zod'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'
import { decryptInvoicePii } from '@/lib/invoice-pii-crypto'
import { toInvoiceRecipientResponse } from '@/lib/invoice-pii-dto'
import {
  buildInvoiceXlsxMetadata,
  createInvoiceInterchangeXlsx,
  mapInvoiceInterchangeRow,
} from '@/lib/invoice-xlsx-export'
import { XLSX_MIME } from '@/lib/xlsx-export'

const exportSchema = z.object({
  mode: z.enum(['single', 'selected']),
  paymentOrderIds: z.array(z.string().trim().min(1).max(255)).min(1).max(1000),
}).strict().superRefine((value, context) => {
  if (new Set(value.paymentOrderIds).size !== value.paymentOrderIds.length) {
    context.addIssue({ code: 'custom', path: ['paymentOrderIds'], message: 'Duplicate payment order seçilemez' })
  }
  if (value.mode === 'single' && value.paymentOrderIds.length !== 1) {
    context.addIssue({ code: 'custom', path: ['paymentOrderIds'], message: 'Tekil export tek kayıt alır' })
  }
})

function snapshotHash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value), 'utf8').digest('hex')
}

export async function POST(req: Request) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = can.readInvoices(ctx as any)
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz export isteği' }, { status: 400 })
  }
  const parsed = exportSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Geçersiz fatura export seçimi' }, { status: 422 })

  const { mode, paymentOrderIds } = parsed.data
  const records = await db.invoiceRecord.findMany({
    where: {
      workspaceId: ctx.workspace.id,
      paymentOrderId: { in: paymentOrderIds },
      paymentOrder: { workspaceId: ctx.workspace.id, status: 'succeeded' },
    },
    select: {
      paymentOrderId: true,
      provider: true,
      documentType: true,
      amountMinor: true,
      taxAmountMinor: true,
      taxRateBps: true,
      currency: true,
      providerInvoiceId: true,
      invoiceNumber: true,
      invoiceUuid: true,
      paymentOrder: {
        select: {
          recipientSnapshot: {
            select: {
              recipientType: true,
              legalNameEncrypted: true,
              taxNumberEncrypted: true,
              taxOfficeEncrypted: true,
              identityNumberEncrypted: true,
              emailEncrypted: true,
              billingAddressEncrypted: true,
              countryCode: true,
            },
          },
        },
      },
    },
  })

  if (records.length !== paymentOrderIds.length) {
    return NextResponse.json({ error: 'Fatura seçimi bulunamadı' }, { status: 404 })
  }

  const recordByPaymentOrder = new Map(records.map(record => [record.paymentOrderId, record]))
  const orderedRecords = paymentOrderIds.map(paymentOrderId => recordByPaymentOrder.get(paymentOrderId)!)
  const batchId = randomUUID()
  const selection = { mode, paymentOrderIds }
  const selectionSnapshotHash = snapshotHash(selection)

  try {
    const metadata = buildInvoiceXlsxMetadata({
      workspaceId: ctx.workspace.id,
      batchId,
      rows: paymentOrderIds.map((paymentOrderId, index) => ({ rowNumber: index + 1, paymentOrderIdSnapshot: paymentOrderId })),
    })
    const rows = orderedRecords.map((record, index) => {
      const recipient = toInvoiceRecipientResponse(record.paymentOrder.recipientSnapshot, value => decryptInvoicePii(value))
      return mapInvoiceInterchangeRow({
        formatVersion: metadata.formatVersion,
        batchId: metadata.batchId,
        rowId: metadata.rows[index].rowId,
        paymentReference: metadata.rows[index].paymentReference,
        invoice: {
          provider: record.provider,
          documentType: record.documentType,
          amountMinor: record.amountMinor,
          currency: record.currency,
          taxAmountMinor: record.taxAmountMinor,
          taxRateBps: record.taxRateBps,
          invoiceNumber: record.invoiceNumber,
          invoiceUuid: record.invoiceUuid,
          recipient,
        },
      })
    })
    const workbook = createInvoiceInterchangeXlsx(rows)

    await db.$transaction(async tx => {
      await tx.invoiceBatch.create({
        data: {
          id: batchId,
          workspaceId: ctx.workspace.id,
          operation: 'manual_export',
          selectionFilterJson: JSON.stringify(selection),
          selectionSnapshotHash,
          formatVersion: metadata.formatVersion,
          status: 'completed',
          completedAt: new Date(),
          rows: {
            create: paymentOrderIds.map((paymentOrderId, index) => ({
              rowNumber: index + 1,
              paymentOrderIdSnapshot: paymentOrderId,
              resultStatus: 'exported',
              sourceRowHash: metadata.rows[index].rowId.slice(4),
            })),
          },
        },
      })
      await tx.auditLog.create({
        data: {
          workspaceId: ctx.workspace.id,
          actorId: ctx.user.id,
          action: 'invoice.export',
          resourceType: 'invoice_batch',
          resourceId: batchId,
          beforeJson: null,
          afterJson: JSON.stringify({ mode, count: paymentOrderIds.length, formatVersion: metadata.formatVersion, selectionSnapshotHash }),
        },
      })
    })

    return new NextResponse(new Uint8Array(workbook), {
      status: 200,
      headers: {
        'Content-Type': XLSX_MIME,
        'Content-Disposition': `attachment; filename="invoice-batch-${batchId}.xlsx"`,
        'Cache-Control': 'private, no-store',
        'X-MavenForms-Batch-Id': batchId,
        'X-MavenForms-Sensitive-Data-Warning': 'Contains confidential invoice recipient data',
      },
    })
  } catch (error) {
    if (error instanceof Error && (error.message.includes('MAVENFORMS_INVOICE_PII_KEY') || error.message === 'invalid invoice PII envelope')) {
      return NextResponse.json({ error: 'Fatura PII güvenliği yapılandırılmadan export açılamaz' }, { status: 503 })
    }
    if (error instanceof Error && error.message === 'invoice_row_invalid') {
      return NextResponse.json({ error: 'Fatura export verisi doğrulanamadı' }, { status: 422 })
    }
    return NextResponse.json({ error: 'Fatura export oluşturulamadı' }, { status: 500 })
  }
}
