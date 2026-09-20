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

const createSurveySchema = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(5000).optional().nullable(),
})

/** Etkinlik anketlerini salt-okunur döndürür; yanıt gövdesi bu uçta yok. */
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

  // Yalnız liste metadata döner; yanıt içerikleri ayrı uçta.
  const rows = await db.survey.findMany({
    where: { workspaceId: ctx.workspace.id, eventId: event.id },
    orderBy: [{ createdAt: 'desc' }],
    take: 100,
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      createdAt: true,
      responses: { select: { id: true } },
    },
  })

  return NextResponse.json({
    data: rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      createdAt: row.createdAt,
      responseCount: row.responses.length,
    })),
  })
}

export async function POST(req: Request, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = can.writeEvents(ctx as any)
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const gate = eventModuleMutationDecision('surveys', parseDisabledEventModules(process.env.EVENT_MODULES_DISABLED))
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
  const parsed = createSurveySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Geçersiz anket verisi' }, { status: 400 })
  }

  const survey = await db.survey.create({
    data: {
      workspaceId: ctx.workspace.id,
      eventId: event.id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      status: 'draft',
    },
  })
  await db.auditLog.create({
    data: {
      workspaceId: ctx.workspace.id,
      actorId: ctx.user.id,
      action: 'event.survey.create',
      resourceType: 'survey',
      resourceId: survey.id,
      beforeJson: JSON.stringify(null),
      afterJson: JSON.stringify({ id: survey.id, eventId: event.id, title: survey.title }),
    },
  })

  return NextResponse.json({ data: { id: survey.id } }, { status: 201 })
}
