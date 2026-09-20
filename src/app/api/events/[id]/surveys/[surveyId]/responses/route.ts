import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'
import { eventModuleMutationDecision, parseDisabledEventModules } from '@/lib/event-module-gate'
import { assertEventReadable } from '@/lib/event-scope'

interface RouteParams {
  params: Promise<{ id: string; surveyId: string }>
}

const submitResponseSchema = z.object({
  respondentName: z.string().trim().max(200).optional().nullable(),
  answers: z.record(z.string(), z.unknown()),
})

const MAX_ANSWERS_BYTES = 100_000

export async function POST(req: Request, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = can.writeEvents(ctx as any)
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const gate = eventModuleMutationDecision('surveys', parseDisabledEventModules(process.env.EVENT_MODULES_DISABLED))
  if (!gate.allowed) return NextResponse.json({ error: gate.error }, { status: gate.status })

  const { id: eventId, surveyId } = await params
  if (!eventId || eventId.length > 128 || !surveyId || surveyId.length > 128) {
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
  const parsed = submitResponseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Geçersiz yanıt verisi' }, { status: 400 })
  }
  const answersJson = JSON.stringify(parsed.data.answers)
  if (answersJson.length > MAX_ANSWERS_BYTES) {
    return NextResponse.json({ error: 'Yanıt gövdesi çok büyük' }, { status: 413 })
  }

  const survey = await db.survey.findFirst({
    where: { id: surveyId, eventId: event.id, workspaceId: ctx.workspace.id },
  })
  if (!survey) return NextResponse.json({ error: 'Anket bulunamadı' }, { status: 404 })
  if (survey.status !== 'published') {
    return NextResponse.json({ error: 'Anket yanıt almıyor' }, { status: 409 })
  }

  const response = await db.surveyResponse.create({
    data: {
      workspaceId: ctx.workspace.id,
      surveyId: survey.id,
      respondentName: parsed.data.respondentName ?? null,
      answersJson,
    },
  })
  await db.auditLog.create({
    data: {
      workspaceId: ctx.workspace.id,
      actorId: ctx.user.id,
      action: 'event.survey.respond',
      resourceType: 'survey',
      resourceId: survey.id,
      beforeJson: JSON.stringify(null),
      afterJson: JSON.stringify({ surveyId: survey.id, responseId: response.id }),
    },
  })

  return NextResponse.json({ data: { id: response.id } }, { status: 201 })
}
