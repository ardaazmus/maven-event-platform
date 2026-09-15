import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'
import { db } from '@/lib/db'
import { BADGE_TEMPLATE_ROOT } from '@/lib/badge-template-storage'
import { listBadgeTemplates } from '@/lib/badge-template-catalog'

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const auth = can.readSubmissions(ctx as any)
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { id } = await params
  const form = await db.form.findFirst({ where: { id, workspaceId: ctx.workspace.id, deletedAt: null }, select: { id: true } })
  if (!form) return NextResponse.json({ error: 'Form bulunamadı' }, { status: 404 })
  const result = await listBadgeTemplates({ workspaceId: ctx.workspace.id, formId: form.id, rootDir: BADGE_TEMPLATE_ROOT })
  if (!result.ok) return NextResponse.json({ error: 'Şablon kataloğu kullanılamıyor', code: result.code }, { status: 500 })
  return NextResponse.json({ data: { templates: result.templates } })
}
