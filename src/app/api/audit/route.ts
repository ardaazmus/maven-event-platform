import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'

export async function GET() {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const logs = await db.auditLog.findMany({
    where: { workspaceId: ctx.workspace.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { actor: { select: { id: true, name: true, email: true } } },
  })

  return NextResponse.json({
    data: logs.map(l => ({
      id: l.id,
      action: l.action,
      resourceType: l.resourceType,
      resourceId: l.resourceId,
      actor: l.actor,
      before: l.beforeJson ? JSON.parse(l.beforeJson) : null,
      after: l.afterJson ? JSON.parse(l.afterJson) : null,
      createdAt: l.createdAt,
    })),
  })
}
