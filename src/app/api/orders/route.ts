import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'
import { assertEventReadable } from '@/lib/event-scope'

const orderItemSchema = z.object({
  description: z.string().min(1).max(200),
  quantity: z.number().int().min(1).max(1000),
  unitAmountMinor: z.number().int().min(0).max(1_000_000_000),
  taxAmountMinor: z.number().int().min(0).max(1_000_000_000).optional().default(0),
  discountAmountMinor: z.number().int().min(0).max(1_000_000_000).optional().default(0),
  currency: z.string().regex(/^[A-Z]{3}$/),
})

const createOrderSchema = z.object({
  currency: z.string().regex(/^[A-Z]{3}$/),
  customerName: z.string().max(200).optional().nullable(),
  eventId: z.string().min(1).optional().nullable(),
  items: z.array(orderItemSchema).min(1).max(100),
})

export async function GET(req: NextRequest) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const _auth = can.readInvoices(ctx as any)
  if (!_auth.allowed) return NextResponse.json({ error: _auth.error }, { status: _auth.status })

  const eventId = req.nextUrl.searchParams.get('eventId')?.trim() || null
  if (eventId) {
    const event = await db.event.findUnique({ where: { id: eventId } })
    if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    try {
      assertEventReadable(event, ctx as any)
    } catch {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
  }

  const rows = await db.order.findMany({
    where: { workspaceId: ctx.workspace.id, ...(eventId ? { eventId } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { _count: { select: { items: true, allocations: true } } },
  })

  return NextResponse.json({
    data: rows.map((row) => ({
      id: row.id,
      eventId: row.eventId,
      status: row.status,
      currency: row.currency,
      customerName: row.customerName,
      itemCount: row._count.items,
      allocationCount: row._count.allocations,
      createdAt: row.createdAt,
    })),
  })
}

export async function POST(req: NextRequest) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // Interim mapping: finance Recorder/Approver rolleri F2 rol fazında gelir
  const _auth = can.manageBilling(ctx as any)
  if (!_auth.allowed) return NextResponse.json({ error: _auth.error }, { status: _auth.status })

  const body = await req.json().catch(() => null)
  const parsed = createOrderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 400 })
  }

  // Currency invariant: all items share order currency
  if (parsed.data.items.some((it) => it.currency !== parsed.data.currency)) {
    return NextResponse.json({ error: 'Currency mismatch' }, { status: 400 })
  }

  // Event scope when given
  if (parsed.data.eventId) {
    const event = await db.event.findFirst({ where: { id: parsed.data.eventId, workspaceId: ctx.workspace.id } })
    if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Order total is the item snapshots total; never recomputed from catalog
  const totalMinor = parsed.data.items.reduce(
    (sum, it) => sum + it.quantity * it.unitAmountMinor + it.taxAmountMinor - it.discountAmountMinor,
    0,
  )
  if (totalMinor < 0) return NextResponse.json({ error: 'Invalid total' }, { status: 400 })

  const order = await db.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        workspaceId: ctx.workspace.id,
        eventId: parsed.data.eventId ?? null,
        customerName: parsed.data.customerName ?? null,
        currency: parsed.data.currency,
        status: 'open',
      },
    })
    await tx.orderItem.createMany({
      data: parsed.data.items.map((it) => ({
        orderId: created.id,
        description: it.description,
        quantity: it.quantity,
        unitAmountMinor: it.unitAmountMinor,
        taxAmountMinor: it.taxAmountMinor ?? 0,
        discountAmountMinor: it.discountAmountMinor ?? 0,
        currency: it.currency,
        snapshotJson: JSON.stringify(it),
      })),
    })
    return created
  })

  return NextResponse.json({ data: { id: order.id, totalMinor, currency: order.currency } }, { status: 201 })
}
