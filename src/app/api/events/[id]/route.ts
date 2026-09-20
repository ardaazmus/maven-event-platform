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
    include: { occurrences: { orderBy: { startsAt: 'asc' } } },
  })
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    assertEventReadable(event, ctx as any)
  } catch (e: any) {
    return NextResponse.json({ error: 'Not found' }, { status: e?.status === 401 ? 401 : 404 })
  }

  return NextResponse.json({
    data: {
      id: event.id,
      title: event.title,
      description: event.description,
      timezone: event.timezone,
      status: event.status,
      occurrences: event.occurrences,
    },
  })
}
