import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const _auth = can.readForms(ctx as any)
  if (!_auth.allowed) return NextResponse.json({ error: _auth.error }, { status: _auth.status })

  const { id } = await params
  const form = await db.form.findFirst({ where: { id, workspaceId: ctx.workspace.id } })
  if (!form) return NextResponse.json({ error: 'Form bulunamadı' }, { status: 404 })

  const notifications = await db.notification.findMany({ where: { formId: id } })

  return NextResponse.json({
    data: notifications.map(n => ({
      id: n.id,
      name: n.name,
      type: n.type,
      enabled: n.enabled,
      config: JSON.parse(n.configJson || '{}'),
    })),
  })
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const _auth = can.writeForms(ctx as any)
  if (!_auth.allowed) return NextResponse.json({ error: _auth.error }, { status: _auth.status })

  const { id } = await params
  const form = await db.form.findFirst({ where: { id, workspaceId: ctx.workspace.id } })
  if (!form) return NextResponse.json({ error: 'Form bulunamadı' }, { status: 404 })

  const body = await req.json()
  if (body.type === 'user_confirmation') {
    const emailFieldCount = await db.formField.count({ where: { formId: id, type: 'email', adminOnly: false, hidden: false } })
    if (emailFieldCount === 0) return NextResponse.json({ error: 'Kullanıcı onayı için public e-posta alanı gerekli' }, { status: 400 })
  }
  const notif = await db.notification.create({
    data: {
      formId: id,
      name: body.name || 'Yeni Bildirim',
      type: body.type || 'admin',
      enabled: body.enabled ?? true,
      configJson: JSON.stringify(body.config || {}),
    },
  })

  return NextResponse.json({ data: notif })
}
