import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'
import { assertEventReadable } from '@/lib/event-scope'

interface RouteParams {
  params: Promise<{ id: string }>
}

const bindSchema = z.object({
  formId: z.string().min(1),
  purpose: z.enum(['registration', 'survey']).optional().default('registration'),
})

async function loadEvent(id: string, ctx: any) {
  const event = await db.event.findUnique({ where: { id } })
  if (!event) return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) }
  try {
    assertEventReadable(event, ctx)
  } catch {
    return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) }
  }
  return { event }
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const _auth = can.readEvents(ctx as any)
  if (!_auth.allowed) return NextResponse.json({ error: _auth.error }, { status: _auth.status })

  const { id } = await params
  const loaded = await loadEvent(id, ctx)
  if ('error' in loaded) return loaded.error

  const rows = await db.eventFormBinding.findMany({
    where: { eventId: id, workspaceId: ctx.workspace.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { form: { select: { id: true, title: true } } },
  })

  return NextResponse.json({
    data: rows.map((row) => ({ id: row.id, purpose: row.purpose, createdAt: row.createdAt, form: row.form })),
  })
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const _auth = can.writeEvents(ctx as any)
  if (!_auth.allowed) return NextResponse.json({ error: _auth.error }, { status: _auth.status })

  const { id } = await params
  const loaded = await loadEvent(id, ctx)
  if ('error' in loaded) return loaded.error

  const body = await req.json().catch(() => null)
  const parsed = bindSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 400 })
  }

  const form = await db.form.findFirst({ where: { id: parsed.data.formId, workspaceId: ctx.workspace.id } })
  if (!form) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const existing = await db.eventFormBinding.findUnique({
    where: { eventId_formId: { eventId: id, formId: form.id } },
  })
  if (existing) return NextResponse.json({ error: 'Already bound' }, { status: 409 })

  // R3: one registration binding per form — orchestration must never choose silently
  if (parsed.data.purpose === 'registration') {
    const clash = await db.eventFormBinding.findFirst({
      where: { formId: form.id, purpose: 'registration', NOT: { eventId: id } },
      select: { id: true },
    })
    if (clash) return NextResponse.json({ error: 'Form already bound to another event' }, { status: 409 })
  }

  const binding = await db.eventFormBinding.create({
    data: { workspaceId: ctx.workspace.id, eventId: id, formId: form.id, purpose: parsed.data.purpose },
  })

  return NextResponse.json({ data: { id: binding.id } }, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const _auth = can.writeEvents(ctx as any)
  if (!_auth.allowed) return NextResponse.json({ error: _auth.error }, { status: _auth.status })

  const { id } = await params
  const loaded = await loadEvent(id, ctx)
  if ('error' in loaded) return loaded.error

  const body = await req.json().catch(() => null)
  const formId = typeof body?.formId === 'string' ? body.formId : null
  if (!formId) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  await db.eventFormBinding.deleteMany({ where: { eventId: id, formId, workspaceId: ctx.workspace.id } })
  return NextResponse.json({ data: { success: true } })
}
