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
  const event = await db.event.findUnique({ where: { id } })
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  try {
    assertEventReadable(event, ctx as any)
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Geometri Floor Editor'un; burada yalniz baglanti metadata doner.
  const rows = await db.floorPlanBinding.findMany({
    where: { eventId: id, workspaceId: ctx.workspace.id },
    orderBy: { updatedAt: 'desc' },
    take: 100,
    select: { id: true, externalPlanId: true, planVersion: true, status: true, updatedAt: true },
  })

  return NextResponse.json({ data: rows })
}
