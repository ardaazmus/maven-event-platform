import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'

interface RouteParams {
  params: Promise<{ id: string }>
}

const allocationSchema = z.object({
  allocations: z.array(z.object({
    orderId: z.string().min(1),
    amountMinor: z.number().int().min(1).max(1_000_000_000_000),
  })).min(1).max(50),
})

async function orderTotal(orderId: string, tx: any) {
  const items = await tx.orderItem.findMany({ where: { orderId } })
  return items.reduce((sum: number, it: any) => sum + it.quantity * it.unitAmountMinor + it.taxAmountMinor - it.discountAmountMinor, 0)
}

async function orderAllocated(orderId: string, tx: any) {
  const rows = await tx.paymentAllocation.findMany({ where: { orderId }, select: { amountMinor: true } })
  return rows.reduce((sum: number, r: any) => sum + r.amountMinor, 0)
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const _auth = can.manageBilling(ctx as any)
  if (!_auth.allowed) return NextResponse.json({ error: _auth.error }, { status: _auth.status })

  const { id } = await params
  const payment = await db.payment.findFirst({ where: { id, workspaceId: ctx.workspace.id } })
  if (!payment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => null)
  const parsed = allocationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 400 })
  }

  // Pre-checks outside tx (read-only): orders exist, same workspace+currency
  for (const a of parsed.data.allocations) {
    const order = await db.order.findFirst({ where: { id: a.orderId, workspaceId: ctx.workspace.id } })
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (order.currency !== payment.currency) {
      return NextResponse.json({ error: 'Currency mismatch' }, { status: 400 })
    }
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const already = await tx.paymentAllocation.findMany({ where: { paymentId: id }, select: { amountMinor: true } })
      const used = already.reduce((sum: number, r: any) => sum + r.amountMinor, 0)
      const requested = parsed.data.allocations.reduce((sum, a) => sum + a.amountMinor, 0)
      if (used + requested > payment.amountMinor) {
        throw Object.assign(new Error('Allocation exceeds payment'), { status: 400 })
      }
      // Per-order cap: allocated total must not exceed order total
      for (const a of parsed.data.allocations) {
        const total = await orderTotal(a.orderId, tx)
        const allocated = await orderAllocated(a.orderId, tx)
        if (allocated + a.amountMinor > total) {
          throw Object.assign(new Error('Allocation exceeds order balance'), { status: 400 })
        }
      }
      await tx.paymentAllocation.createMany({
        data: parsed.data.allocations.map((a) => ({ paymentId: id, orderId: a.orderId, amountMinor: a.amountMinor })),
      })
      // Balance projection per touched order
      const statuses: Record<string, string> = {}
      for (const a of parsed.data.allocations) {
        const total = await orderTotal(a.orderId, tx)
        const allocated = await orderAllocated(a.orderId, tx)
        const status = allocated === 0 ? 'open' : allocated < total ? 'partially_paid' : 'paid'
        await tx.order.update({ where: { id: a.orderId }, data: { status } })
        statuses[a.orderId] = status
      }
      const unallocatedMinor = payment.amountMinor - used - requested
      return { unallocatedMinor, statuses }
    })
    return NextResponse.json({ data: result })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Allocation failed' }, { status: e?.status === 400 ? 400 : 500 })
  }
}
