import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'
import { assertEventReadable } from '@/lib/event-scope'

interface RouteParams {
  params: Promise<{ id: string }>
}

const createOccurrenceSchema = z.object({
  venue: z.string().max(200).optional().nullable(),
  hall: z.string().max(200).optional().nullable(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  timezone: z.string().min(1).max(100).optional().default('Europe/Istanbul'),
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

  const rows = await db.eventOccurrence.findMany({
    where: { eventId: id },
    orderBy: { startsAt: 'asc' },
    take: 100,
    select: { id: true, venue: true, hall: true, startsAt: true, endsAt: true, timezone: true, status: true },
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
  } catch (e: any) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json().catch(() => null)
  const parsed = createOccurrenceSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 400 })
  }

  const startsAt = new Date(parsed.data.startsAt)
  const endsAt = new Date(parsed.data.endsAt)
  if (!(startsAt < endsAt)) {
    return NextResponse.json({ error: 'startsAt must be before endsAt' }, { status: 400 })
  }

  const occurrence = await db.eventOccurrence.create({
    data: {
      eventId: id,
      venue: parsed.data.venue ?? null,
      hall: parsed.data.hall ?? null,
      startsAt,
      endsAt,
      timezone: parsed.data.timezone ?? 'Europe/Istanbul',
    },
  })

  return NextResponse.json({ data: { id: occurrence.id } }, { status: 201 })
}
