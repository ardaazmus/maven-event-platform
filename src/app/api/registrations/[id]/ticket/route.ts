import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const _auth = can.writeEvents(ctx as any)
  if (!_auth.allowed) return NextResponse.json({ error: _auth.error }, { status: _auth.status })

  const { id } = await params
  const registration = await db.registration.findFirst({ where: { id, workspaceId: ctx.workspace.id } })
  if (!registration) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const existing = await db.ticket.findUnique({ where: { registrationId: id } })
  if (existing) return NextResponse.json({ error: 'Already issued' }, { status: 409 })

  const result = await db.$transaction(async (tx) => {
    const ticket = await tx.ticket.create({
      data: {
        workspaceId: ctx.workspace.id,
        eventId: registration.eventId,
        registrationId: id,
        code: `tkt_${randomBytes(12).toString('hex')}`,
      },
    })
    const credential = await tx.credential.create({
      data: {
        workspaceId: ctx.workspace.id,
        ticketId: ticket.id,
        qrCode: `qr_${randomBytes(16).toString('hex')}`,
      },
    })
    return { ticket, credential }
  })

  return NextResponse.json({ data: { id: result.ticket.id, code: result.ticket.code, qrCode: result.credential.qrCode } }, { status: 201 })
}
