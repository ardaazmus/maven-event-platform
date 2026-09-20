import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'
import { assertEventReadable } from '@/lib/event-scope'
import { eventModuleMutationDecision, parseDisabledEventModules } from '@/lib/event-module-gate'

interface RouteParams {
  params: Promise<{ id: string }>
}

const createProgramSessionSchema = z.object({
  title: z.string().trim().min(1).max(200),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  room: z.string().trim().max(100).optional().nullable(),
  occurrenceId: z.string().min(1).max(128).optional().nullable(),
}).refine((body) => new Date(body.endsAt).getTime() > new Date(body.startsAt).getTime(), {
  message: 'Bitiş başlangıçtan sonra olmalı',
})

/** Etkinlik programını salt-okunur döndürür; konuşmacıda yalnız ad/unvan listelenir. */
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

  // Yalnız program metadata döner; kayıt/katılımcı detayı bu uçta yok.
  const rows = await db.programSession.findMany({
    where: { workspaceId: ctx.workspace.id, eventId: event.id },
    orderBy: [{ startsAt: 'asc' }],
    take: 100,
    select: {
      id: true,
      title: true,
      startsAt: true,
      endsAt: true,
      room: true,
      speakers: { select: { speaker: { select: { id: true, fullName: true, title: true } } } },
    },
  })

  return NextResponse.json({
    data: rows.map((row) => ({ ...row, speakers: row.speakers.map((link) => link.speaker) })),
  })
}

export async function POST(req: Request, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = can.writeEvents(ctx as any)
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const gate = eventModuleMutationDecision('program', parseDisabledEventModules(process.env.EVENT_MODULES_DISABLED))
  if (!gate.allowed) return NextResponse.json({ error: gate.error }, { status: gate.status })

  const { id: eventId } = await params
  if (!eventId || eventId.length > 128) return NextResponse.json({ error: 'Etkinlik bulunamadı' }, { status: 404 })

  const event = await db.event.findUnique({ where: { id: eventId } })
  if (!event) return NextResponse.json({ error: 'Etkinlik bulunamadı' }, { status: 404 })
  try {
    assertEventReadable(event, ctx as any)
  } catch {
    return NextResponse.json({ error: 'Etkinlik bulunamadı' }, { status: 404 })
  }

  const body = await req.json().catch(() => null)
  const parsed = createProgramSessionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Geçersiz oturum verisi' }, { status: 400 })
  }

  if (parsed.data.occurrenceId) {
    const occurrence = await db.eventOccurrence.findUnique({ where: { id: parsed.data.occurrenceId } })
    if (!occurrence || occurrence.eventId !== event.id) {
      return NextResponse.json({ error: 'Oturum dönemi bu etkinliğe ait değil' }, { status: 400 })
    }
  }

  const session = await db.programSession.create({
    data: {
      workspaceId: ctx.workspace.id,
      eventId: event.id,
      occurrenceId: parsed.data.occurrenceId ?? null,
      title: parsed.data.title,
      startsAt: new Date(parsed.data.startsAt),
      endsAt: new Date(parsed.data.endsAt),
      room: parsed.data.room ?? null,
    },
  })
  await db.auditLog.create({
    data: {
      workspaceId: ctx.workspace.id,
      actorId: ctx.user.id,
      action: 'event.program_session.create',
      resourceType: 'program_session',
      resourceId: session.id,
      beforeJson: JSON.stringify(null),
      afterJson: JSON.stringify({ id: session.id, eventId: event.id, title: session.title }),
    },
  })

  return NextResponse.json({ data: { id: session.id } }, { status: 201 })
}
