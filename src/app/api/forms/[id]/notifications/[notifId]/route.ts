import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ id: string; notifId: string }>
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, notifId } = await params
  const form = await db.form.findFirst({ where: { id, workspaceId: ctx.workspace.id } })
  if (!form) return NextResponse.json({ error: 'Form bulunamadı' }, { status: 404 })

  const body = await req.json()
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

  const { id, notifId } = await params
  const form = await db.form.findFirst({ where: { id, workspaceId: ctx.workspace.id } })
  if (!form) return NextResponse.json({ error: 'Form bulunamadı' }, { status: 404 })

  await db.notification.delete({ where: { id: notifId, formId: id } })
  return NextResponse.json({ data: { success: true } })
}
