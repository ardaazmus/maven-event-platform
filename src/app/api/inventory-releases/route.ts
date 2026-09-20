import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'

const releaseSchema = z.object({
  holdToken: z.string().min(1).max(200),
  reason: z.string().min(1).max(500),
})

export async function POST(req: NextRequest) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const _auth = can.writeEvents(ctx as any)
  if (!_auth.allowed) return NextResponse.json({ error: _auth.error }, { status: _auth.status })

  const body = await req.json().catch(() => null)
  const parsed = releaseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const hold = await db.inventoryHold.findFirst({
    where: { holdToken: parsed.data.holdToken, workspaceId: ctx.workspace.id },
  })
  if (!hold) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  // Early-release protection: booked holds cannot be released this way
  if (hold.status === 'booked') {
    return NextResponse.json({ error: 'Booked hold cannot be released' }, { status: 409 })
  }
  if (hold.status !== 'held') {
    return NextResponse.json({ error: 'Hold not releasable' }, { status: 409 })
  }

  const updated = await db.inventoryHold.update({
    where: { id: hold.id },
    data: { status: 'released' },
  })

  return NextResponse.json({ data: { id: updated.id, status: updated.status } })
}
