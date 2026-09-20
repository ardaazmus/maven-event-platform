import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'

interface RouteParams {
  params: Promise<{ id: string }>
}

const assignSchema = z.object({
  ticketId: z.string().min(1),
})

export async function POST(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const _auth = can.writeEvents(ctx as any)
  if (!_auth.allowed) return NextResponse.json({ error: _auth.error }, { status: _auth.status })

  const { id } = await params
  const hold = await db.inventoryHold.findFirst({ where: { id, workspaceId: ctx.workspace.id } })
  if (!hold) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => null)
  const parsed = assignSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const ticket = await db.ticket.findFirst({
    where: { id: parsed.data.ticketId, workspaceId: ctx.workspace.id },
  })
  if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (ticket.eventId !== hold.eventId) {
    return NextResponse.json({ error: 'Ticket event mismatch' }, { status: 422 })
  }

  const updated = await db.inventoryHold.update({
    where: { id },
    data: { assignedTicketId: ticket.id },
  })

  return NextResponse.json({ data: { id: updated.id, assignedTicketId: updated.assignedTicketId } })
}
