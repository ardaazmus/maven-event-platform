import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'

const bookingSchema = z.object({
  holdToken: z.string().min(1).max(200),
  orderId: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const _auth = can.writeEvents(ctx as any)
  if (!_auth.allowed) return NextResponse.json({ error: _auth.error }, { status: _auth.status })

  const body = await req.json().catch(() => null)
  const parsed = bookingSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const hold = await db.inventoryHold.findFirst({
    where: { holdToken: parsed.data.holdToken, workspaceId: ctx.workspace.id },
  })
  if (!hold) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Idempotent retry: same token+order returns same result
  if (hold.status === 'booked' && hold.orderId === parsed.data.orderId) {
    return NextResponse.json({ data: { id: hold.id, status: hold.status } })
  }
  if (hold.status !== 'held') {
    return NextResponse.json({ error: 'Hold not bookable' }, { status: 409 })
  }
  if (hold.expiresAt.getTime() <= Date.now()) {
    await db.inventoryHold.update({ where: { id: hold.id }, data: { status: 'expired' } })
    return NextResponse.json({ error: 'Hold expired' }, { status: 410 })
  }

  const order = await db.order.findFirst({ where: { id: parsed.data.orderId, workspaceId: ctx.workspace.id } })
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await db.inventoryHold.update({
    where: { id: hold.id },
    data: { status: 'booked', orderId: order.id },
  })

  return NextResponse.json({ data: { id: updated.id, status: updated.status } })
}
