import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'

const scanSchema = z.object({
  qrCode: z.string().min(1).max(200),
  direction: z.enum(['entry', 'exit']).optional().default('entry'),
  gate: z.string().max(100).optional().nullable(),
  deviceId: z.string().max(100).optional().nullable(),
  // Offline cihaz saati; 7 günden eski ve gelecek değerler reddedilir
  occurredAt: z.string().datetime().optional().nullable(),
})

export async function GET(req: NextRequest) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const _auth = can.readEvents(ctx as any)
  if (!_auth.allowed) return NextResponse.json({ error: _auth.error }, { status: _auth.status })

  const occurrenceId = req.nextUrl.searchParams.get('occurrenceId')?.trim() || null
  if (occurrenceId) {
    const occurrence = await db.eventOccurrence.findUnique({ where: { id: occurrenceId }, include: { event: { select: { workspaceId: true } } } })
    if (!occurrence || occurrence.event.workspaceId !== ctx.workspace.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
  }

  const rows = await db.checkInEvent.findMany({
    where: { workspaceId: ctx.workspace.id, ...(occurrenceId ? { occurrenceId } : {}) },
    orderBy: { occurredAt: 'desc' },
    take: 100,
  })

  return NextResponse.json({
    data: rows.map((row) => ({
      id: row.id,
      credentialId: row.credentialId,
      occurrenceId: row.occurrenceId,
      gate: row.gate,
      deviceId: row.deviceId,
      operatorId: row.operatorId,
      direction: row.direction,
      occurredAt: row.occurredAt,
      createdAt: row.createdAt,
    })),
  })
}

export async function POST(req: NextRequest) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const _auth = can.writeEvents(ctx as any)
  if (!_auth.allowed) return NextResponse.json({ error: _auth.error }, { status: _auth.status })

  const body = await req.json().catch(() => null)
  const parsed = scanSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const credential = await db.credential.findFirst({
    where: { qrCode: parsed.data.qrCode, workspaceId: ctx.workspace.id },
  })
  if (!credential) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const now = Date.now()
  let occurredAt = new Date(now)
  if (parsed.data.occurredAt) {
    occurredAt = new Date(parsed.data.occurredAt)
    if (Number.isNaN(occurredAt.getTime())) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    if (occurredAt.getTime() > now + 5 * 60_000) {
      return NextResponse.json({ error: 'Future timestamp' }, { status: 400 })
    }
    if (occurredAt.getTime() < now - 7 * 24 * 3600_000) {
      return NextResponse.json({ error: 'Timestamp too old' }, { status: 400 })
    }
  }

  // Duplicate policy: same credential+direction within ±60s of occurredAt
  const recent = await db.checkInEvent.findFirst({
    where: {
      credentialId: credential.id,
      direction: parsed.data.direction,
      occurredAt: { gte: new Date(occurredAt.getTime() - 60_000), lte: new Date(occurredAt.getTime() + 60_000) },
    },
    orderBy: { occurredAt: 'desc' },
  })
  if (recent) return NextResponse.json({ error: 'Duplicate scan', duplicateOf: recent.id }, { status: 409 })

  const event = await db.checkInEvent.create({
    data: {
      workspaceId: ctx.workspace.id,
      credentialId: credential.id,
      gate: parsed.data.gate ?? null,
      deviceId: parsed.data.deviceId ?? null,
      operatorId: ctx.user.id,
      direction: parsed.data.direction ?? 'entry',
      occurredAt,
    },
  })

  return NextResponse.json({ data: { id: event.id, direction: event.direction } }, { status: 201 })
}
