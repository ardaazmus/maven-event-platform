import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'

const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  timezone: z.string().min(1).max(100).optional().default('Europe/Istanbul'),
})

export async function GET() {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const _auth = can.readEvents(ctx as any)
  if (!_auth.allowed) return NextResponse.json({ error: _auth.error }, { status: _auth.status })

  const events = await db.event.findMany({
    where: { workspaceId: ctx.workspace.id },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { occurrences: true } } },
  })

  return NextResponse.json({
    data: events.map(e => ({
      id: e.id,
      title: e.title,
      description: e.description,
      timezone: e.timezone,
      status: e.status,
      occurrenceCount: e._count.occurrences,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    })),
  })
}

export async function POST(req: NextRequest) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const _auth = can.writeEvents(ctx as any)
  if (!_auth.allowed) return NextResponse.json({ error: _auth.error }, { status: _auth.status })

  const body = await req.json().catch(() => null)
  const parsed = createEventSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 400 })
  }

  const event = await db.event.create({
    data: {
      workspaceId: ctx.workspace.id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      timezone: parsed.data.timezone ?? 'Europe/Istanbul',
      createdById: ctx.user.id,
    },
  })

  return NextResponse.json({ data: { id: event.id, title: event.title } }, { status: 201 })
}
