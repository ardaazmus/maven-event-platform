import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const _auth = can.writeInvoices(ctx as any)
  if (!_auth.allowed) return NextResponse.json({ error: _auth.error }, { status: _auth.status })

  const { id } = await params
  const request = await db.invoiceRequest.findFirst({ where: { id, workspaceId: ctx.workspace.id } })
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (request.status !== 'requested' && request.status !== 'data_review') {
    return NextResponse.json({ error: 'Already processed' }, { status: 409 })
  }

  let totalMinor = 0
  let currency = 'TRY'
  let orderId: string | null = null
  if (request.orderId) {
    const order = await db.order.findFirst({
      where: { id: request.orderId, workspaceId: ctx.workspace.id },
      include: { items: true },
    })
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    orderId = order.id
    currency = order.currency
    totalMinor = order.items.reduce((sum, it) => sum + it.quantity * it.unitAmountMinor + it.taxAmountMinor - it.discountAmountMinor, 0)
  }

  const result = await db.$transaction(async (tx) => {
    await tx.invoiceRequest.update({ where: { id }, data: { status: 'approved' } })
    return tx.invoice.create({
      data: {
        workspaceId: ctx.workspace.id,
        requestId: id,
        orderId,
        type: 'sales',
        currency,
        totalMinor,
        status: 'data_review',
      },
    })
  })

  return NextResponse.json({ data: { id: result.id, status: result.status } }, { status: 201 })
}
