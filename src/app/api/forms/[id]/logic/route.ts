import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const form = await db.form.findFirst({ where: { id, workspaceId: ctx.workspace.id } })
  if (!form) return NextResponse.json({ error: 'Form bulunamadı' }, { status: 404 })

  const rules = await db.logicRule.findMany({
    where: { formId: id },
    orderBy: { priority: 'asc' },
  })

  return NextResponse.json({
    data: rules.map(r => ({
      id: r.id,
      name: r.name,
      priority: r.priority,
      conditions: JSON.parse(r.conditionsJson || '{}'),
      actions: JSON.parse(r.actionsJson || '{}'),
      enabled: r.enabled,
    })),
  })
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const form = await db.form.findFirst({ where: { id, workspaceId: ctx.workspace.id } })
  if (!form) return NextResponse.json({ error: 'Form bulunamadı' }, { status: 404 })

  const body = await req.json()
  const rule = await db.logicRule.create({
    data: {
      formId: id,
      name: body.name || `Kural ${Date.now()}`,
      priority: body.priority ?? 0,
      conditionsJson: JSON.stringify(body.conditions || {}),
      actionsJson: JSON.stringify(body.actions || {}),
      enabled: body.enabled ?? true,
    },
  })

  return NextResponse.json({ data: rule })
}
