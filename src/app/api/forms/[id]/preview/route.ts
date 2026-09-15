import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sanitizePublicForm } from '@/lib/public-dto'
import { getSessionFromRequest } from '@/lib/auth'
import { can } from '@/lib/policy'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Authenticated preview - requires workspace membership
export async function GET(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromRequest(req)
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const auth = can.readForms(ctx as any)
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')

  const where: any = { deletedAt: null }
  if (slug) where.slug = slug
  else where.id = id

  const form = await db.form.findFirst({
    where,
    include: {
      fields: {
        where: { adminOnly: false, hidden: false },
        orderBy: { sortOrder: 'asc' },
      },
      themes: { take: 1 },
    },
  })

  if (!form) return NextResponse.json({ error: 'Form bulunamadı' }, { status: 404 })
  if (form.workspaceId !== ctx.workspace.id) {
    return NextResponse.json({ error: 'Form bulunamadı' }, { status: 404 })
  }

  return NextResponse.json({
    data: sanitizePublicForm(form),
  })
}
