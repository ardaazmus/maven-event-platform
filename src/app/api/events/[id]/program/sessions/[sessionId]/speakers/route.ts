import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'
import { eventModuleMutationDecision, parseDisabledEventModules } from '@/lib/event-module-gate'
import { assertEventReadable } from '@/lib/event-scope'

interface RouteParams {
  params: Promise<{ id: string; sessionId: string }>
}

const assignSpeakerSchema = z.object({
  speakerId: z.string().min(1).max(128),
})

export async function POST(req: Request, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = can.writeEvents(ctx as any)
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const gate = eventModuleMutationDecision('speakers', parseDisabledEventModules(process.env.EVENT_MODULES_DISABLED))
  if (!gate.allowed) return NextResponse.json({ error: gate.error }, { status: gate.status })

  const { id: eventId, sessionId } = await params
  if (!eventId || eventId.length > 128 || !sessionId || sessionId.length > 128) {
    return NextResponse.json({ error: 'Etkinlik bulunamadı' }, { status: 404 })
  }

  const event = await db.event.findUnique({ where: { id: eventId } })
  if (!event) return NextResponse.json({ error: 'Etkinlik bulunamadı' }, { status: 404 })
  try {
    assertEventReadable(event, ctx as any)
  } catch {
    return NextResponse.json({ error: 'Etkinlik bulunamadı' }, { status: 404 })
  }

  const body = await req.json().catch(() => null)
  const parsed = assignSpeakerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Geçersiz atama verisi' }, { status: 400 })
  }

  const session = await db.programSession.findFirst({
    where: { id: sessionId, eventId: event.id, workspaceId: ctx.workspace.id },
  })
  if (!session) return NextResponse.json({ error: 'Oturum bulunamadı' }, { status: 404 })

  const speaker = await db.speaker.findFirst({
    where: { id: parsed.data.speakerId, workspaceId: ctx.workspace.id },
  })
  if (!speaker) return NextResponse.json({ error: 'Konuşmacı bulunamadı' }, { status: 404 })

  const existing = await db.sessionSpeaker.findUnique({
    where: { sessionId_speakerId: { sessionId: session.id, speakerId: speaker.id } },
  })
  if (existing) return NextResponse.json({ data: { linked: true, existing: true } }, { status: 200 })

  await db.sessionSpeaker.create({ data: { sessionId: session.id, speakerId: speaker.id } })
  await db.auditLog.create({
    data: {
      workspaceId: ctx.workspace.id,
      actorId: ctx.user.id,
      action: 'event.program_speaker.assign',
      resourceType: 'program_session',
      resourceId: session.id,
      beforeJson: JSON.stringify(null),
      afterJson: JSON.stringify({ sessionId: session.id, speakerId: speaker.id }),
    },
  })

  return NextResponse.json({ data: { linked: true, existing: false } }, { status: 201 })
}
