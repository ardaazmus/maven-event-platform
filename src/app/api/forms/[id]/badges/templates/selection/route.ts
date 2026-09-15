import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'
import { db } from '@/lib/db'
import { BADGE_TEMPLATE_ROOT } from '@/lib/badge-template-storage'
import { findBadgeTemplate } from '@/lib/badge-template-catalog'

interface RouteParams { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const auth = can.writeForms(ctx as any)
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { id } = await params
  const form = await db.form.findFirst({ where: { id, workspaceId: ctx.workspace.id, deletedAt: null } })
  if (!form) return NextResponse.json({ error: 'Form bulunamadı' }, { status: 404 })
  const body = await req.json().catch(() => null) as { templateId?: unknown; versionId?: unknown } | null
  if (typeof body?.templateId !== 'string' || typeof body.versionId !== 'string') return NextResponse.json({ error: 'Şablon sürümü gerekli' }, { status: 400 })
  const template = await findBadgeTemplate({ workspaceId: ctx.workspace.id, formId: form.id, templateId: body.templateId, versionId: body.versionId, rootDir: BADGE_TEMPLATE_ROOT })
  if (!template) return NextResponse.json({ error: 'Şablon bu forma ait değil' }, { status: 404 })
  let settings: Record<string, unknown> = {}
  try {
    const parsed = JSON.parse(form.settingsJson || '{}')
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) settings = parsed
  } catch {}
  const previous = settings.badge && typeof settings.badge === 'object' && !Array.isArray(settings.badge) ? settings.badge as Record<string, unknown> : {}
  const updated = await db.form.update({ where: { id: form.id }, data: { settingsJson: JSON.stringify({ ...settings, badge: { ...previous, templateId: template.templateId, templateVersionId: template.versionId } }) } })
  await db.auditLog.create({ data: { workspaceId: ctx.workspace.id, actorId: ctx.user.id, action: 'form.badge_template.select', resourceType: 'form', resourceId: form.id, beforeJson: JSON.stringify({ badge: previous }), afterJson: JSON.stringify({ badge: { templateId: template.templateId, templateVersionId: template.versionId } }) } })
  return NextResponse.json({ data: { templateId: template.templateId, templateVersionId: template.versionId, settingsJson: updated.settingsJson } })
}
