import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'
import { assertEventReadable } from '@/lib/event-scope'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const _auth = can.readEvents(ctx as any)
  if (!_auth.allowed) return NextResponse.json({ error: _auth.error }, { status: _auth.status })

  const { id } = await params
  const event = await db.event.findUnique({
    where: { id },
    select: {
      id: true,
      workspaceId: true,
      title: true,
      status: true,
      _count: {
        select: {
          occurrences: true,
          registrations: true,
          formBindings: true,
          orders: true,
          tickets: true,
          planBindings: true,
          holds: true,
          sessions: true,
        },
      },
    },
  })
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    assertEventReadable(event, ctx as any)
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const counts = event._count
  return NextResponse.json({
    data: {
      eventId: event.id,
      title: event.title,
      status: event.status,
      gates: {
        setup: counts.occurrences > 0,
        formBinding: counts.formBindings > 0,
        registration: counts.registrations > 0,
        order: counts.orders > 0,
        ticket: counts.tickets > 0,
        floor: counts.planBindings > 0,
        program: counts.sessions > 0,
        hold: counts.holds > 0,
      },
      counts,
    },
  })
}
