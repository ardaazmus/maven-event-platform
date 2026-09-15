import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'

interface RouteParams {
  params: Promise<{ id: string; notifId: string }>
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const _auth = can.writeForms(ctx as any)
  if (!_auth.allowed) return NextResponse.json({ error: _auth.error }, { status: _auth.status })

  const { id, notifId } = await params
  const form = await db.form.findFirst({ where: { id, workspaceId: ctx.workspace.id } })
  if (!form) return NextResponse.json({ error: 'Form bulunamadı' }, { status: 404 })

  const body = await req.json()
  const existing = await db.notification.findFirst({ where: { id: notifId, formId: id }, select: { type: true } })
  if (!existing) return NextResponse.json({ error: 'Bildirim bulunamadı' }, { status: 404 })
  if ((body.type ?? existing.type) === 'user_confirmation') {
    const emailFieldCount = await db.formField.count({ where: { formId: id, type: 'email', adminOnly: false, hidden: false } })
    if (emailFieldCount === 0) return NextResponse.json({ error: 'Kullanıcı onayı için public e-posta alanı gerekli' }, { status: 400 })
  }
  const data: any = {}
  if (body.name !== undefined) data.name = body.name
  if (body.type !== undefined) data.type = body.type
  if (body.enabled !== undefined) data.enabled = body.enabled
  if (body.config !== undefined) data.configJson = JSON.stringify(body.config)

  const notif = await db.notification.update({ where: { id: notifId, formId: id }, data })
  return NextResponse.json({ data: notif })
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const _auth = can.writeForms(ctx as any)
  if (!_auth.allowed) return NextResponse.json({ error: _auth.error }, { status: _auth.status })

  const { id, notifId } = await params
  const form = await db.form.findFirst({ where: { id, workspaceId: ctx.workspace.id } })
  if (!form) return NextResponse.json({ error: 'Form bulunamadı' }, { status: 404 })

  await db.notification.delete({ where: { id: notifId, formId: id } })
  return NextResponse.json({ data: { success: true } })
}
