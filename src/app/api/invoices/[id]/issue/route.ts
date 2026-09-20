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
  const invoice = await db.invoice.findFirst({ where: { id, workspaceId: ctx.workspace.id } })
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (invoice.status !== 'data_review' && invoice.status !== 'approved_for_issue') {
    return NextResponse.json({ error: 'Not issuable' }, { status: 409 })
  }

  // Mismatch gate: invoice total must equal current order total
  if (invoice.orderId) {
    const items = await db.orderItem.findMany({ where: { orderId: invoice.orderId } })
    const total = items.reduce((sum, it) => sum + it.quantity * it.unitAmountMinor + it.taxAmountMinor - it.discountAmountMinor, 0)
    if (total !== invoice.totalMinor) {
      return NextResponse.json({ error: 'Order total mismatch' }, { status: 422 })
    }
  }

  const year = new Date().getFullYear()
  const count = await db.invoice.count({ where: { workspaceId: ctx.workspace.id, NOT: { number: null } } })
  const number = `INV-${year}-${String(count + 1).padStart(6, '0')}`

  const updated = await db.invoice.update({
    where: { id },
    data: { status: 'issued', number, issuedAt: new Date() },
  })

  return NextResponse.json({ data: { id: updated.id, status: updated.status, number: updated.number } })
}
