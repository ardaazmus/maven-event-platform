import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'
import { eventModuleMutationDecision, parseDisabledEventModules } from '@/lib/event-module-gate'
import { assertEventReadable } from '@/lib/event-scope'

interface RouteParams {
  params: Promise<{ id: string }>
}

const createSpeakerSchema = z.object({
  fullName: z.string().trim().min(1).max(200),
  title: z.string().trim().max(200).optional().nullable(),
})

export async function POST(req: Request, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = can.writeEvents(ctx as any)
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const gate = eventModuleMutationDecision('speakers', parseDisabledEventModules(process.env.EVENT_MODULES_DISABLED))
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
  const parsed = createSpeakerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Geçersiz konuşmacı verisi' }, { status: 400 })
  }

  const speaker = await db.speaker.create({
    data: {
      workspaceId: ctx.workspace.id,
      fullName: parsed.data.fullName,
      title: parsed.data.title ?? null,
    },
  })
  await db.auditLog.create({
    data: {
      workspaceId: ctx.workspace.id,
      actorId: ctx.user.id,
      action: 'event.speaker.create',
      resourceType: 'speaker',
      resourceId: speaker.id,
      beforeJson: JSON.stringify(null),
      afterJson: JSON.stringify({ id: speaker.id, eventId: event.id, fullName: speaker.fullName }),
    },
  })

  return NextResponse.json({ data: { id: speaker.id } }, { status: 201 })
}
