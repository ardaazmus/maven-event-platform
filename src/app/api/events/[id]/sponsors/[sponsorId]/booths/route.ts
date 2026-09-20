import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'
import { eventModuleMutationDecision, parseDisabledEventModules } from '@/lib/event-module-gate'
import { assertEventReadable } from '@/lib/event-scope'

interface RouteParams {
  params: Promise<{ id: string; sponsorId: string }>
}

const assignBoothSchema = z.object({
  code: z.string().trim().min(1).max(50),
  zone: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
})

export async function POST(req: Request, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = can.writeEvents(ctx as any)
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const gate = eventModuleMutationDecision('sponsors', parseDisabledEventModules(process.env.EVENT_MODULES_DISABLED))
  if (!gate.allowed) return NextResponse.json({ error: gate.error }, { status: gate.status })

  const { id: eventId, sponsorId } = await params
  if (!eventId || eventId.length > 128 || !sponsorId || sponsorId.length > 128) {
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
  const parsed = assignBoothSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Geçersiz stand verisi' }, { status: 400 })
  }

  const sponsor = await db.sponsor.findFirst({
    where: { id: sponsorId, eventId: event.id, workspaceId: ctx.workspace.id },
  })
  if (!sponsor) return NextResponse.json({ error: 'Sponsor bulunamadı' }, { status: 404 })

  const existing = await db.sponsorBooth.findUnique({
    where: { sponsorId_code: { sponsorId: sponsor.id, code: parsed.data.code } },
  })
  if (existing) return NextResponse.json({ data: { id: existing.id, existing: true } }, { status: 200 })

  const booth = await db.sponsorBooth.create({
    data: {
      workspaceId: ctx.workspace.id,
      sponsorId: sponsor.id,
      code: parsed.data.code,
      zone: parsed.data.zone ?? null,
      notes: parsed.data.notes ?? null,
    },
  })
  await db.auditLog.create({
    data: {
      workspaceId: ctx.workspace.id,
      actorId: ctx.user.id,
      action: 'event.sponsor_booth.assign',
      resourceType: 'sponsor',
      resourceId: sponsor.id,
      beforeJson: JSON.stringify(null),
      afterJson: JSON.stringify({ sponsorId: sponsor.id, code: booth.code }),
    },
  })

  return NextResponse.json({ data: { id: booth.id, existing: false } }, { status: 201 })
}
