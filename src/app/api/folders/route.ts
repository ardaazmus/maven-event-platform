import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'

export async function GET() {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const _auth = can.readForms(ctx as any)
  if (!_auth.allowed) return NextResponse.json({ error: _auth.error }, { status: _auth.status })

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
  const _auth = can.writeForms(ctx as any)
  if (!_auth.allowed) return NextResponse.json({ error: _auth.error }, { status: _auth.status })

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
