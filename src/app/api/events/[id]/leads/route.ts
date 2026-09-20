import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'
import { assertEventReadable } from '@/lib/event-scope'

interface RouteParams {
  params: Promise<{ id: string }>
}

/** Etkinlik leadlerini salt-okunur döndürür; yazma bu uçta yok. */
export async function GET(req: Request, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = can.readEvents(ctx as any)
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id: eventId } = await params
  if (!eventId || eventId.length > 128) return NextResponse.json({ error: 'Etkinlik bulunamadı' }, { status: 404 })

  const event = await db.event.findUnique({ where: { id: eventId } })
  if (!event) return NextResponse.json({ error: 'Etkinlik bulunamadı' }, { status: 404 })
  try {
    assertEventReadable(event, ctx as any)
  } catch {
    return NextResponse.json({ error: 'Etkinlik bulunamadı' }, { status: 404 })
  }

  const rows = await db.lead.findMany({
    where: { workspaceId: ctx.workspace.id, eventId: event.id },
    orderBy: [{ createdAt: 'desc' }],
    take: 100,
    select: {
      id: true,
      fullName: true,
      company: true,
      email: true,
      note: true,
      createdAt: true,
    },
  })

  return NextResponse.json({ data: rows })
}
