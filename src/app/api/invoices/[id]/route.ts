import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { decryptInvoicePii } from '@/lib/invoice-pii-crypto'
import { toInvoiceResponse } from '@/lib/invoice-pii-dto'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'

interface RouteParams {
  params: Promise<{ id: string }>
}

/** Authenticated invoice view; there is intentionally no public invoice route. */
export async function GET(_req: Request, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = can.readInvoices(ctx as any)
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  if (!id || id.length > 128) return NextResponse.json({ error: 'Fatura bulunamadı' }, { status: 404 })

  const record = await db.invoiceRecord.findFirst({
    where: { id, workspaceId: ctx.workspace.id },
    select: {
      id: true,
      workspaceId: true,
      paymentOrderId: true,
      provider: true,
      documentType: true,
      amountMinor: true,
      currency: true,
      state: true,
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
      lines: {
        select: {
          lineNumber: true,
          description: true,
          quantity: true,
          lineTotalMinor: true,
          currency: true,
        },
        orderBy: { lineNumber: 'asc' },
      },
      documents: {
        select: { id: true, state: true, scanStatus: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!record) return NextResponse.json({ error: 'Fatura bulunamadı' }, { status: 404 })

  try {
    const data = toInvoiceResponse(
      { ...record, recipientSnapshot: record.paymentOrder.recipientSnapshot },
      ctx.user.role,
      value => decryptInvoicePii(value),
    )
    return NextResponse.json({ data }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    if (error instanceof Error && error.message === 'invoice_access_denied') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Fatura güvenli biçimde okunamadı' }, { status: 503 })
  }
}
