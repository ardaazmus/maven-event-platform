import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'

export async function GET() {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const folders = await db.folder.findMany({
    where: { workspaceId: ctx.workspace.id },
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { forms: true } } },
  })

  return NextResponse.json({
    data: folders.map(f => ({
      id: f.id,
      name: f.name,
      color: f.color,
      parentId: f.parentId,
      sortOrder: f.sortOrder,
      formCount: f._count.forms,
    })),
  })
}

export async function POST(req: NextRequest) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const folder = await db.folder.create({
    data: {
      workspaceId: ctx.workspace.id,
      name: body.name,
      color: body.color || '#64748b',
      parentId: body.parentId || null,
    },
  })

  return NextResponse.json({ data: folder })
}
