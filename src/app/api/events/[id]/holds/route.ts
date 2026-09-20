import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { randomBytes } from 'crypto'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'
import { assertEventReadable } from '@/lib/event-scope'

interface RouteParams {
  params: Promise<{ id: string }>
}

const holdSchema = z.object({
  spaceRef: z.string().min(1).max(200),
  ttlMinutes: z.number().int().min(0).max(1440).optional().default(10),
})

export async function GET(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const _auth = can.readEvents(ctx as any)
  if (!_auth.allowed) return NextResponse.json({ error: _auth.error }, { status: _auth.status })

  const { id } = await params
  const event = await db.event.findUnique({ where: { id } })
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  try {
    assertEventReadable(event, ctx as any)
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Rezervasyon jetonu listede donulmez; booking yalniz ayri kanaldan yapilir.
  const rows = await db.inventoryHold.findMany({
    where: { eventId: id, workspaceId: ctx.workspace.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: { id: true, spaceRef: true, status: true, expiresAt: true, orderId: true, assignedTicketId: true, createdAt: true },
  })

  return NextResponse.json({ data: rows })
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const _auth = can.writeEvents(ctx as any)
  if (!_auth.allowed) return NextResponse.json({ error: _auth.error }, { status: _auth.status })

  const { id } = await params
  const event = await db.event.findUnique({ where: { id } })
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  try {
    assertEventReadable(event, ctx as any)
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json().catch(() => null)
  const parsed = holdSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const now = new Date()
  const active = await db.inventoryHold.findFirst({
    where: {
      eventId: id,
      spaceRef: parsed.data.spaceRef,
      status: 'held',
      expiresAt: { gt: now },
    },
    select: { id: true },
  })
  if (active) return NextResponse.json({ error: 'Space already held', holdId: active.id }, { status: 409 })

  const hold = await db.inventoryHold.create({
    data: {
      workspaceId: ctx.workspace.id,
      eventId: id,
      spaceRef: parsed.data.spaceRef,
      holdToken: `hold_${randomBytes(12).toString('hex')}`,
      status: 'held',
      expiresAt: new Date(now.getTime() + parsed.data.ttlMinutes * 60_000),
    },
  })

  return NextResponse.json({ data: { id: hold.id, holdToken: hold.holdToken, expiresAt: hold.expiresAt } }, { status: 201 })
}
