import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'

export async function GET() {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tags = await db.tag.findMany({
    where: { workspaceId: ctx.workspace.id },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({ data: tags })
}

export async function POST(req: NextRequest) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  try {
    const tag = await db.tag.create({
      data: {
        workspaceId: ctx.workspace.id,
        name: body.name,
        color: body.color || '#10b981',
      },
    })
    return NextResponse.json({ data: tag })
  } catch (e) {
    return NextResponse.json({ error: 'Etiket zaten mevcut' }, { status: 409 })
  }
}
