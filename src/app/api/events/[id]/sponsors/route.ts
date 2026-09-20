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

const createSponsorSchema = z.object({
  name: z.string().trim().min(1).max(200),
  tier: z.enum(['platinum', 'gold', 'silver', 'standard']).default('standard'),
  website: z.string().trim().max(500).optional().nullable(),
})

/** Etkinlik sponsorlarını salt-okunur döndürür; stand kodları dahildir. */
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

  // Yalnız liste metadata döner; website metindir, harici baglanti uretilmez.
  const rows = await db.sponsor.findMany({
    where: { workspaceId: ctx.workspace.id, eventId: event.id },
    orderBy: [{ name: 'asc' }],
    take: 100,
    select: {
      id: true,
      name: true,
      tier: true,
      website: true,
      booths: { select: { id: true, code: true, zone: true } },
    },
  })

  return NextResponse.json({ data: rows })
}

export async function POST(req: Request, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = can.writeEvents(ctx as any)
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const gate = eventModuleMutationDecision('sponsors', parseDisabledEventModules(process.env.EVENT_MODULES_DISABLED))
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
  const parsed = createSponsorSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Geçersiz sponsor verisi' }, { status: 400 })
  }

  const sponsor = await db.sponsor.create({
    data: {
      workspaceId: ctx.workspace.id,
      eventId: event.id,
      name: parsed.data.name,
      tier: parsed.data.tier,
      website: parsed.data.website ?? null,
    },
  })
  await db.auditLog.create({
    data: {
      workspaceId: ctx.workspace.id,
      actorId: ctx.user.id,
      action: 'event.sponsor.create',
      resourceType: 'sponsor',
      resourceId: sponsor.id,
      beforeJson: JSON.stringify(null),
      afterJson: JSON.stringify({ id: sponsor.id, eventId: event.id, name: sponsor.name }),
    },
  })

  return NextResponse.json({ data: { id: sponsor.id } }, { status: 201 })
}
