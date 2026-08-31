import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ id: string; ruleId: string }>
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, ruleId } = await params
  const form = await db.form.findFirst({ where: { id, workspaceId: ctx.workspace.id } })
  if (!form) return NextResponse.json({ error: 'Form bulunamadı' }, { status: 404 })

  const body = await req.json()
  const data: any = {}
  if (body.name !== undefined) data.name = body.name
  if (body.priority !== undefined) data.priority = body.priority
  if (body.conditions !== undefined) data.conditionsJson = JSON.stringify(body.conditions)
  if (body.actions !== undefined) data.actionsJson = JSON.stringify(body.actions)
  if (body.enabled !== undefined) data.enabled = body.enabled

  const rule = await db.logicRule.update({ where: { id: ruleId, formId: id }, data })
  return NextResponse.json({ data: rule })
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, ruleId } = await params
  const form = await db.form.findFirst({ where: { id, workspaceId: ctx.workspace.id } })
  if (!form) return NextResponse.json({ error: 'Form bulunamadı' }, { status: 404 })

  await db.logicRule.delete({ where: { id: ruleId, formId: id } })
  return NextResponse.json({ data: { success: true } })
}
