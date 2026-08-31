import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const form = await db.form.findFirst({
    where: { id, workspaceId: ctx.workspace.id, deletedAt: null },
    include: {
      folder: true,
      tags: { include: { tag: true } },
      owner: { select: { id: true, name: true, email: true } },
      creator: { select: { id: true, name: true, email: true } },
      fields: { orderBy: { sortOrder: 'asc' } },
      themes: true,
      notifications: true,
      logicRules: { orderBy: { priority: 'asc' } },
      _count: { select: { submissions: true } },
    },
  })

  if (!form) return NextResponse.json({ error: 'Form bulunamadı' }, { status: 404 })

  return NextResponse.json({
    data: {
      ...form,
      settings: JSON.parse(form.settingsJson || '{}'),
      fields: form.fields.map(f => ({
        ...f,
        config: JSON.parse(f.configJson || '{}'),
      })),
      themes: form.themes.map(t => ({ ...t, tokens: JSON.parse(t.tokensJson || '{}') })),
      notifications: form.notifications.map(n => ({ ...n, config: JSON.parse(n.configJson || '{}') })),
      logicRules: form.logicRules.map(r => ({
        ...r,
        conditions: JSON.parse(r.conditionsJson || '{}'),
        actions: JSON.parse(r.actionsJson || '{}'),
      })),
    },
  })
}

const updateFormSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().nullable().optional(),
  status: z.enum(['draft', 'published', 'paused', 'archived']).optional(),
  folderId: z.string().nullable().optional(),
  settingsJson: z.string().optional(),
  responseLimit: z.number().nullable().optional(),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
  closedMessage: z.string().nullable().optional(),
})

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  try {
    const body = await req.json()
    const parsed = updateFormSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Geçersiz veri' }, { status: 400 })
    }

    const form = await db.form.findFirst({
      where: { id, workspaceId: ctx.workspace.id, deletedAt: null },
    })
    if (!form) return NextResponse.json({ error: 'Form bulunamadı' }, { status: 404 })

    const data: any = {}
    if (parsed.data.title !== undefined) data.title = parsed.data.title
    if (parsed.data.description !== undefined) data.description = parsed.data.description
    if (parsed.data.status !== undefined) data.status = parsed.data.status
    if (parsed.data.folderId !== undefined) data.folderId = parsed.data.folderId
    if (parsed.data.settingsJson !== undefined) data.settingsJson = parsed.data.settingsJson
    if (parsed.data.responseLimit !== undefined) data.responseLimit = parsed.data.responseLimit
    if (parsed.data.startDate !== undefined) data.startDate = parsed.data.startDate ? new Date(parsed.data.startDate) : null
    if (parsed.data.endDate !== undefined) data.endDate = parsed.data.endDate ? new Date(parsed.data.endDate) : null
    if (parsed.data.closedMessage !== undefined) data.closedMessage = parsed.data.closedMessage

    const before = form
    const updated = await db.form.update({ where: { id }, data })

    await db.auditLog.create({
      data: {
        workspaceId: ctx.workspace.id,
        actorId: ctx.user.id,
        action: 'form.update',
        resourceType: 'form',
        resourceId: form.id,
        beforeJson: JSON.stringify({ title: before.title, status: before.status }),
        afterJson: JSON.stringify({ title: updated.title, status: updated.status }),
      },
    })

    return NextResponse.json({ data: updated })
  } catch (e) {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  // Soft delete
  const form = await db.form.findFirst({
    where: { id, workspaceId: ctx.workspace.id, deletedAt: null },
  })
  if (!form) return NextResponse.json({ error: 'Form bulunamadı' }, { status: 404 })

  await db.form.update({
    where: { id },
    data: { status: 'archived', deletedAt: new Date() },
  })

  await db.auditLog.create({
    data: {
      workspaceId: ctx.workspace.id,
      actorId: ctx.user.id,
      action: 'form.delete',
      resourceType: 'form',
      resourceId: form.id,
      beforeJson: JSON.stringify({ title: form.title }),
    },
  })

  return NextResponse.json({ data: { success: true } })
}

// Duplicate form
export async function POST(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const url = new URL(req.url)
  const action = url.searchParams.get('action')

  if (action !== 'duplicate') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const form = await db.form.findFirst({
    where: { id, workspaceId: ctx.workspace.id, deletedAt: null },
    include: { fields: true },
  })
  if (!form) return NextResponse.json({ error: 'Form bulunamadı' }, { status: 404 })

  const newSlug = `${form.slug}-kopya-${Date.now().toString(36).slice(-4)}`
  const newForm = await db.form.create({
    data: {
      workspaceId: ctx.workspace.id,
      folderId: form.folderId,
      ownerId: ctx.user.id,
      createdById: ctx.user.id,
      title: `${form.title} (Kopya)`,
      description: form.description,
      slug: newSlug,
      status: 'draft',
      settingsJson: form.settingsJson,
    },
  })

  // Copy fields
  for (const field of form.fields) {
    await db.formField.create({
      data: {
        formId: newForm.id,
        fieldKey: field.fieldKey,
        type: field.type,
        label: field.label,
        description: field.description,
        placeholder: field.placeholder,
        helpText: field.helpText,
        required: field.required,
        unique: field.unique,
        readOnly: field.readOnly,
        hidden: field.hidden,
        adminOnly: field.adminOnly,
        encrypted: field.encrypted,
        defaultValue: field.defaultValue,
        configJson: field.configJson,
        sortOrder: field.sortOrder,
      },
    })
  }

  await db.auditLog.create({
    data: {
      workspaceId: ctx.workspace.id,
      actorId: ctx.user.id,
      action: 'form.duplicate',
      resourceType: 'form',
      resourceId: newForm.id,
      afterJson: JSON.stringify({ title: newForm.title, sourceId: form.id }),
    },
  })

  return NextResponse.json({ data: newForm })
}
