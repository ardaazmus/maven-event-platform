import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'
import { normalizeFieldConfig } from '@/lib/form-document'

interface RouteParams {
  params: Promise<{ id: string; fieldId: string }>
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const _auth = can.writeForms(ctx as any)
  if (!_auth.allowed) return NextResponse.json({ error: _auth.error }, { status: _auth.status })

  const { id, fieldId } = await params
  const form = await db.form.findFirst({ where: { id, workspaceId: ctx.workspace.id } })
  if (!form) return NextResponse.json({ error: 'Form bulunamadı' }, { status: 404 })

  const body = await req.json()
  const data: any = {}
  if (body.label !== undefined) data.label = body.label
  if (body.description !== undefined) data.description = body.description
  if (body.placeholder !== undefined) data.placeholder = body.placeholder
  if (body.helpText !== undefined) data.helpText = body.helpText
  if (body.required !== undefined) data.required = body.required
  if (body.hidden !== undefined) data.hidden = body.hidden
  if (body.readOnly !== undefined) data.readOnly = body.readOnly
  if (body.adminOnly !== undefined) data.adminOnly = body.adminOnly
  if (body.unique !== undefined) data.unique = body.unique
  if (body.encrypted !== undefined) data.encrypted = body.encrypted
  if (body.defaultValue !== undefined) data.defaultValue = body.defaultValue
  if (body.config !== undefined) data.configJson = JSON.stringify(normalizeFieldConfig(body.config))
  if (body.fieldKey !== undefined) data.fieldKey = body.fieldKey
  if (body.type !== undefined) data.type = body.type
  if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder

  const field = await db.formField.update({ where: { id: fieldId, formId: id }, data })
  return NextResponse.json({ data: { ...field, config: normalizeFieldConfig(JSON.parse(field.configJson || '{}')) } })
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const _auth = can.writeForms(ctx as any)
  if (!_auth.allowed) return NextResponse.json({ error: _auth.error }, { status: _auth.status })

  const { id, fieldId } = await params
  const form = await db.form.findFirst({ where: { id, workspaceId: ctx.workspace.id } })
  if (!form) return NextResponse.json({ error: 'Form bulunamadı' }, { status: 404 })

  await db.formField.delete({ where: { id: fieldId, formId: id } })
  return NextResponse.json({ data: { success: true } })
}
