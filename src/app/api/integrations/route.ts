import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'

export async function GET() {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const integrations = await db.integration.findMany({
    where: { workspaceId: ctx.workspace.id },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({
    data: integrations.map(i => ({
      id: i.id,
      provider: i.provider,
      name: i.name,
      status: i.status,
      config: JSON.parse(i.configJson || '{}'),
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
    })),
  })
}
