import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { createHash } from 'crypto'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const form = await db.form.findFirst({
    where: { id, workspaceId: ctx.workspace.id, deletedAt: null },
    include: { fields: { orderBy: { sortOrder: 'asc' } } },
  })
  if (!form) return NextResponse.json({ error: 'Form bulunamadı' }, { status: 404 })

  // Validation: at least 1 field
  if (form.fields.length === 0) {
    return NextResponse.json({ error: 'Formda en az bir alan olmalı' }, { status: 400 })
  }

  // Get next version number
  const lastVersion = await db.formVersion.findFirst({
    where: { formId: id },
    orderBy: { versionNo: 'desc' },
  })
  const versionNo = (lastVersion?.versionNo ?? 0) + 1

  // Snapshot schema
  const schema = {
    title: form.title,
    description: form.description,
    settings: JSON.parse(form.settingsJson || '{}'),
    fields: form.fields.map(f => ({
      fieldKey: f.fieldKey,
      type: f.type,
      label: f.label,
      required: f.required,
      config: JSON.parse(f.configJson || '{}'),
    })),
  }
  const schemaJson = JSON.stringify(schema)
  const checksum = createHash('sha256').update(schemaJson).digest('hex')

  const version = await db.formVersion.create({
    data: {
      formId: id,
      versionNo,
      schemaJson,
      checksum,
      status: 'published',
      publishedAt: new Date(),
    },
  })

  const updated = await db.form.update({
    where: { id },
    data: {
      status: 'published',
      publishedVersionId: version.id,
    },
  })

  await db.auditLog.create({
    data: {
      workspaceId: ctx.workspace.id,
      actorId: ctx.user.id,
      action: 'form.publish',
      resourceType: 'form',
      resourceId: form.id,
      afterJson: JSON.stringify({ version: versionNo, status: 'published' }),
    },
  })

  return NextResponse.json({ data: { form: updated, version } })
}
