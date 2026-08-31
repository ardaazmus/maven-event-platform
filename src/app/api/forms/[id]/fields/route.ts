import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string }>
}

const createFieldSchema = z.object({
  fieldKey: z.string().min(1),
  type: z.string(),
  label: z.string().min(1),
  description: z.string().optional().nullable(),
  placeholder: z.string().optional().nullable(),
  helpText: z.string().optional().nullable(),
  required: z.boolean().default(false),
  unique: z.boolean().default(false),
  readOnly: z.boolean().default(false),
  hidden: z.boolean().default(false),
  adminOnly: z.boolean().default(false),
  encrypted: z.boolean().default(false),
  defaultValue: z.string().optional().nullable(),
  config: z.any().optional(),
  sortOrder: z.number().optional(),
})

export async function POST(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const form = await db.form.findFirst({ where: { id, workspaceId: ctx.workspace.id, deletedAt: null } })
  if (!form) return NextResponse.json({ error: 'Form bulunamadı' }, { status: 404 })

  const body = await req.json()
  const parsed = createFieldSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Geçersiz alan verisi' }, { status: 400 })
  }

  const maxSort = await db.formField.aggregate({
    where: { formId: id },
    _max: { sortOrder: true },
  })

  const field = await db.formField.create({
    data: {
      formId: id,
      fieldKey: parsed.data.fieldKey,
      type: parsed.data.type,
      label: parsed.data.label,
      description: parsed.data.description ?? null,
      placeholder: parsed.data.placeholder ?? null,
      helpText: parsed.data.helpText ?? null,
      required: parsed.data.required,
      unique: parsed.data.unique,
      readOnly: parsed.data.readOnly,
      hidden: parsed.data.hidden,
      adminOnly: parsed.data.adminOnly,
      encrypted: parsed.data.encrypted,
      defaultValue: parsed.data.defaultValue ?? null,
      configJson: JSON.stringify(parsed.data.config || {}),
      sortOrder: parsed.data.sortOrder ?? (maxSort._max.sortOrder ?? 0) + 1,
    },
  })

  return NextResponse.json({ data: { ...field, config: JSON.parse(field.configJson || '{}') } })
}

// Reorder fields
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const form = await db.form.findFirst({ where: { id, workspaceId: ctx.workspace.id, deletedAt: null } })
  if (!form) return NextResponse.json({ error: 'Form bulunamadı' }, { status: 404 })

  const body = await req.json()
  // Body: { updates: [{ id, sortOrder, ...other fields }] }
  if (body.updates && Array.isArray(body.updates)) {
    for (const u of body.updates) {
      const { id: fieldId, sortOrder, ...rest } = u
      const data: any = {}
      if (sortOrder !== undefined) data.sortOrder = sortOrder
      if (rest.label !== undefined) data.label = rest.label
      if (rest.description !== undefined) data.description = rest.description
      if (rest.placeholder !== undefined) data.placeholder = rest.placeholder
      if (rest.helpText !== undefined) data.helpText = rest.helpText
      if (rest.required !== undefined) data.required = rest.required
      if (rest.hidden !== undefined) data.hidden = rest.hidden
      if (rest.readOnly !== undefined) data.readOnly = rest.readOnly
      if (rest.adminOnly !== undefined) data.adminOnly = rest.adminOnly
      if (rest.defaultValue !== undefined) data.defaultValue = rest.defaultValue
      if (rest.config !== undefined) data.configJson = JSON.stringify(rest.config)
      if (rest.fieldKey !== undefined) data.fieldKey = rest.fieldKey
      if (rest.type !== undefined) data.type = rest.type

      await db.formField.update({ where: { id: fieldId, formId: id }, data })
    }
    return NextResponse.json({ data: { success: true } })
  }

  return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 })
}
