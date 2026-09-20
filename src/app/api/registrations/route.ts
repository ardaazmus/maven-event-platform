import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'
import { assertEventReadable } from '@/lib/event-scope'

const createRegistrationSchema = z.object({
  eventId: z.string().min(1),
  personId: z.string().min(1),
  formId: z.string().min(1).optional().nullable(),
})

export async function GET(req: NextRequest) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const _auth = can.readEvents(ctx as any)
  if (!_auth.allowed) return NextResponse.json({ error: _auth.error }, { status: _auth.status })

  const eventId = req.nextUrl.searchParams.get('eventId')?.trim()
  if (!eventId) return NextResponse.json({ error: 'eventId gerekli' }, { status: 400 })

  const event = await db.event.findUnique({ where: { id: eventId } })
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  try {
    assertEventReadable(event, ctx as any)
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const rows = await db.registration.findMany({
    where: { workspaceId: ctx.workspace.id, eventId: event.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { person: { select: { id: true, fullName: true, email: true } } },
  })

  return NextResponse.json({
    data: rows.map((row) => ({ id: row.id, status: row.status, formId: row.formId, createdAt: row.createdAt, person: row.person })),
  })
}

export async function POST(req: NextRequest) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const _auth = can.writeEvents(ctx as any)
  if (!_auth.allowed) return NextResponse.json({ error: _auth.error }, { status: _auth.status })

  const body = await req.json().catch(() => null)
  const parsed = createRegistrationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 400 })
  }

  const event = await db.event.findUnique({ where: { id: parsed.data.eventId } })
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  try {
    assertEventReadable(event, ctx as any)
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const person = await db.person.findUnique({ where: { id: parsed.data.personId } })
  if (!person || person.workspaceId !== ctx.workspace.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const registration = await db.$transaction(async (tx) => {
    const reg = await tx.registration.create({
      data: {
        workspaceId: ctx.workspace.id,
        eventId: event.id,
        personId: person.id,
        formId: parsed.data.formId ?? null,
        status: 'submitted',
      },
    })
    await tx.registrationHistory.create({
      data: { registrationId: reg.id, fromStatus: null, toStatus: 'submitted', actorId: ctx.user.id },
    })
    return reg
  })

  return NextResponse.json({ data: { id: registration.id } }, { status: 201 })
}
