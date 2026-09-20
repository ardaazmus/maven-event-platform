import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'

interface RouteParams {
  params: Promise<{ id: string }>
}

// F4-4.2: ticket -> credential + participant/event display snapshot binding.
// Render package (PDF/ZIP) mevcut badge pipeline ile ayrı fazda üretilir.
export async function GET(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const _auth = can.readEvents(ctx as any)
  if (!_auth.allowed) return NextResponse.json({ error: _auth.error }, { status: _auth.status })

  const { id } = await params
  const ticket = await db.ticket.findFirst({
    where: { id, workspaceId: ctx.workspace.id },
    include: {
      credential: true,
      event: { select: { id: true, title: true } },
      registration: { include: { person: { select: { id: true, fullName: true } } } },
    },
  })
  if (!ticket || !ticket.credential) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    data: {
      ticketId: ticket.id,
      code: ticket.code,
      status: ticket.status,
      qrCode: ticket.credential.qrCode,
      personName: ticket.registration.person.fullName,
      eventTitle: ticket.event.title,
    },
  })
}
