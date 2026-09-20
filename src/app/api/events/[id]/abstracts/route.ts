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

const createAbstractSchema = z.object({
  authorName: z.string().trim().min(1).max(200),
  title: z.string().trim().min(1).max(300),
  body: z.string().trim().min(1).max(20000),
})

/** Etkinlik bildirilerini salt-okunur döndürür; değerlendirme özeti yalnız sayı/ortalamadır. */
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

  // Yalnız liste metadata döner; bildiri gövdesi ve hakem kimliği bu uçta yok.
  const rows = await db.abstract.findMany({
    where: { workspaceId: ctx.workspace.id, eventId: event.id },
    orderBy: [{ createdAt: 'desc' }],
    take: 100,
    select: {
      id: true,
      title: true,
      authorName: true,
      status: true,
      createdAt: true,
      reviews: { select: { score: true } },
    },
  })

  return NextResponse.json({
    data: rows.map((row) => ({
      id: row.id,
      title: row.title,
      authorName: row.authorName,
      status: row.status,
      createdAt: row.createdAt,
      reviewCount: row.reviews.length,
      averageScore: row.reviews.length
        ? Math.round((row.reviews.reduce((sum, review) => sum + review.score, 0) / row.reviews.length) * 10) / 10
        : null,
    })),
  })
}

export async function POST(req: Request, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = can.writeEvents(ctx as any)
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const gate = eventModuleMutationDecision('abstracts', parseDisabledEventModules(process.env.EVENT_MODULES_DISABLED))
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
  const parsed = createAbstractSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Geçersiz bildiri verisi' }, { status: 400 })
  }

  const created = await db.abstract.create({
    data: {
      workspaceId: ctx.workspace.id,
      eventId: event.id,
      authorName: parsed.data.authorName,
      title: parsed.data.title,
      body: parsed.data.body,
      status: 'submitted',
    },
  })
  await db.auditLog.create({
    data: {
      workspaceId: ctx.workspace.id,
      actorId: ctx.user.id,
      action: 'event.abstract.submit',
      resourceType: 'abstract',
      resourceId: created.id,
      beforeJson: JSON.stringify(null),
      afterJson: JSON.stringify({ id: created.id, eventId: event.id, title: created.title }),
    },
  })

  return NextResponse.json({ data: { id: created.id } }, { status: 201 })
}
