import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'

export async function POST(req: NextRequest) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const _auth = can.writeEvents(ctx as any)
  if (!_auth.allowed) return NextResponse.json({ error: _auth.error }, { status: _auth.status })

  const result = await db.inventoryHold.updateMany({
    where: {
      workspaceId: ctx.workspace.id,
      status: 'held',
      expiresAt: { lte: new Date() },
    },
    data: { status: 'expired' },
  })

  return NextResponse.json({ data: { expiredCount: result.count } })
}
