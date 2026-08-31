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

  const themes = await db.theme.findMany({
    where: { OR: [{ workspaceId: ctx.workspace.id, formId: null }, { formId: id }] },
  })

  return NextResponse.json({
    data: themes.map(t => ({
      id: t.id,
      name: t.name,
      tokens: JSON.parse(t.tokensJson || '{}'),
      customCss: t.customCss,
      font: t.font,
      radius: t.radius,
      version: t.version,
    })),
  })
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const form = await db.form.findFirst({ where: { id, workspaceId: ctx.workspace.id } })
  if (!form) return NextResponse.json({ error: 'Form bulunamadı' }, { status: 404 })

  const body = await req.json()

  // Update or create theme for form
  const existing = await db.theme.findFirst({ where: { formId: id } })
  if (existing) {
    const updated = await db.theme.update({
      where: { id: existing.id },
      data: {
        name: body.name || existing.name,
        tokensJson: JSON.stringify(body.tokens || JSON.parse(existing.tokensJson || '{}')),
        customCss: body.customCss ?? existing.customCss,
        font: body.font || existing.font,
        radius: body.radius ?? existing.radius,
        version: { increment: 1 },
      },
    })
    return NextResponse.json({ data: { ...updated, tokens: JSON.parse(updated.tokensJson || '{}') } })
  } else {
    const created = await db.theme.create({
      data: {
        workspaceId: ctx.workspace.id,
        formId: id,
        name: body.name || 'Custom',
        tokensJson: JSON.stringify(body.tokens || {}),
        customCss: body.customCss || '',
        font: body.font || 'Inter',
        radius: body.radius ?? 0.625,
      },
    })
    return NextResponse.json({ data: { ...created, tokens: JSON.parse(created.tokensJson || '{}') } })
  }
}
