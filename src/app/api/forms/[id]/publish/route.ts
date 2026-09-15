import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'
import { containsForbiddenKeys, sanitizePublicForm } from '@/lib/public-dto'
import { createHash } from 'crypto'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const auth = can.writeForms(ctx as any)
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const form = await db.form.findFirst({
    where: { id, workspaceId: ctx.workspace.id, deletedAt: null },
    include: {
      fields: { orderBy: { sortOrder: 'asc' } },
      themes: { take: 1 },
      appearance: true,
      paymentConfig: { select: { enabled: true, provider: true, pricingPolicyJson: true } },
    },
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

  // Snapshot schema — single source via sanitizePublicForm + snapshot fields
  const publicSnapshot = sanitizePublicForm(form)
  const schema = {
    ...publicSnapshot,
    publishedAt: new Date().toISOString(),
    versionNo,
  }
  // Validate no internal leakage before store (AC-PUBLIC-03)
  const leakedKeys = containsForbiddenKeys(schema)
  if (leakedKeys.length > 0) throw new Error(`snapshot leakage: ${leakedKeys.join(', ')}`)
  const schemaJson = JSON.stringify(schema)
  const checksum = createHash('sha256').update(schemaJson).digest('hex')

  // Atomic publish: version + archive previous + form + audit
  const { version, updated } = await db.$transaction(async (tx) => {
    const ver = await tx.formVersion.create({
      data: { formId: id, versionNo, schemaJson, checksum, status: 'published', publishedAt: new Date() },
    })
    // Archive previous published version if exists
    if (form.publishedVersionId) {
      await tx.formVersion.updateMany({
        where: { id: form.publishedVersionId, status: 'published' },
        data: { status: 'archived' },
      })
    }
    const upd = await tx.form.update({
      where: { id },
      data: { status: 'published', publishedVersionId: ver.id },
    })
    await tx.auditLog.create({
      data: {
        workspaceId: ctx.workspace.id,
        actorId: ctx.user.id,
        action: 'form.publish',
        resourceType: 'form',
        resourceId: form.id,
        afterJson: JSON.stringify({ version: versionNo, status: 'published' }),
      },
    })
    return { version: ver, updated: upd }
  })

  return NextResponse.json({ data: { form: updated, version } })
}
