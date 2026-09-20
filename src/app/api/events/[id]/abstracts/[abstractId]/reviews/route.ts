import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'
import { eventModuleMutationDecision, parseDisabledEventModules } from '@/lib/event-module-gate'
import { assertEventReadable } from '@/lib/event-scope'

interface RouteParams {
  params: Promise<{ id: string; abstractId: string }>
}

const createReviewSchema = z.object({
  score: z.number().int().min(0).max(100),
  comment: z.string().trim().max(5000).optional().nullable(),
})

export async function POST(req: Request, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = can.writeEvents(ctx as any)
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const gate = eventModuleMutationDecision('abstracts', parseDisabledEventModules(process.env.EVENT_MODULES_DISABLED))
  if (!gate.allowed) return NextResponse.json({ error: gate.error }, { status: gate.status })

  const { id: eventId, abstractId } = await params
  if (!eventId || eventId.length > 128 || !abstractId || abstractId.length > 128) {
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
  const parsed = createReviewSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Geçersiz değerlendirme verisi' }, { status: 400 })
  }

  const abstract = await db.abstract.findFirst({
    where: { id: abstractId, eventId: event.id, workspaceId: ctx.workspace.id },
  })
  if (!abstract) return NextResponse.json({ error: 'Bildiri bulunamadı' }, { status: 404 })

  const review = await db.abstractReview.create({
    data: {
      workspaceId: ctx.workspace.id,
      abstractId: abstract.id,
      reviewerId: ctx.user.id,
      score: parsed.data.score,
      comment: parsed.data.comment ?? null,
    },
  })
  await db.auditLog.create({
    data: {
      workspaceId: ctx.workspace.id,
      actorId: ctx.user.id,
      action: 'event.abstract.review',
      resourceType: 'abstract',
      resourceId: abstract.id,
      beforeJson: JSON.stringify(null),
      afterJson: JSON.stringify({ abstractId: abstract.id, reviewerId: ctx.user.id, score: review.score }),
    },
  })

  return NextResponse.json({ data: { id: review.id } }, { status: 201 })
}
