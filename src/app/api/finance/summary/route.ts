import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'

export async function GET() {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const _auth = can.manageBilling(ctx as any)
  if (!_auth.allowed) return NextResponse.json({ error: _auth.error }, { status: _auth.status })

  const ws = ctx.workspace.id
  const payments = await db.payment.findMany({
    where: { workspaceId: ws, status: { in: ['recorded', 'under_review', 'confirmed'] } },
    select: { id: true, currency: true, amountMinor: true, status: true },
  })
  const allocations = await db.paymentAllocation.findMany({
    where: { payment: { workspaceId: ws } },
    select: { paymentId: true, orderId: true, amountMinor: true },
  })
  const orders = await db.order.findMany({
    where: { workspaceId: ws, status: { in: ['open', 'partially_paid', 'paid'] } },
    select: { id: true, currency: true, status: true },
  })
  const items = await db.orderItem.findMany({
    where: { order: { workspaceId: ws } },
    select: { orderId: true, quantity: true, unitAmountMinor: true, taxAmountMinor: true, discountAmountMinor: true },
  })

  const byCurrency = new Map<string, { collectedMinor: number; openMinor: number; unallocatedMinor: number; pendingReviewMinor: number }>()
  const row = (currency: string) => {
    let r = byCurrency.get(currency)
    if (!r) {
      r = { collectedMinor: 0, openMinor: 0, unallocatedMinor: 0, pendingReviewMinor: 0 }
      byCurrency.set(currency, r)
    }
    return r
  }

  const allocatedByPayment = new Map<string, number>()
  const allocatedByOrder = new Map<string, number>()
  for (const a of allocations) {
    allocatedByPayment.set(a.paymentId, (allocatedByPayment.get(a.paymentId) || 0) + a.amountMinor)
    allocatedByOrder.set(a.orderId, (allocatedByOrder.get(a.orderId) || 0) + a.amountMinor)
  }
  const totalByOrder = new Map<string, number>()
  for (const it of items) {
    totalByOrder.set(
      it.orderId,
      (totalByOrder.get(it.orderId) || 0) + it.quantity * it.unitAmountMinor + it.taxAmountMinor - it.discountAmountMinor,
    )
  }

  for (const p of payments) {
    const r = row(p.currency)
    const used = allocatedByPayment.get(p.id) || 0
    r.unallocatedMinor += p.amountMinor - used
    if (p.status === 'confirmed') r.collectedMinor += p.amountMinor
    else r.pendingReviewMinor += p.amountMinor
  }
  for (const o of orders) {
    const total = totalByOrder.get(o.id) || 0
    const allocated = allocatedByOrder.get(o.id) || 0
    if (allocated < total) row(o.currency).openMinor += total - allocated
  }

  return NextResponse.json({
    data: {
      currencies: [...byCurrency.entries()].map(([currency, v]) => ({ currency, ...v })),
    },
  })
}
