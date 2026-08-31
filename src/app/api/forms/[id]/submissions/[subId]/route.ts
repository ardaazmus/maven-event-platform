import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ id: string; subId: string }>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, subId } = await params
  const form = await db.form.findFirst({ where: { id, workspaceId: ctx.workspace.id } })
  if (!form) return NextResponse.json({ error: 'Form bulunamadı' }, { status: 404 })

  const submission = await db.submission.findFirst({
    where: { id: subId, formId: id },
    include: {
      values: { include: { field: true } },
      submitter: { select: { id: true, name: true, email: true } },
      files: true,
    },
  })

  if (!submission) return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 })

  return NextResponse.json({
    data: {
      ...submission,
      values: submission.values.map(v => ({
        id: v.id,
        fieldId: v.fieldId,
        value: JSON.parse(v.valueJson || '{}'),
        normalizedText: v.normalizedText,
        field: v.field,
      })),
    },
  })
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, subId } = await params
  const form = await db.form.findFirst({ where: { id, workspaceId: ctx.workspace.id } })
  if (!form) return NextResponse.json({ error: 'Form bulunamadı' }, { status: 404 })

  const body = await req.json()
  const data: any = {}
  if (body.status) data.status = body.status
  if (body.paymentStatus !== undefined) data.paymentStatus = body.paymentStatus

  const before = await db.submission.findUnique({ where: { id: subId } })
  const updated = await db.submission.update({ where: { id: subId }, data })

  await db.auditLog.create({
    data: {
      workspaceId: ctx.workspace.id,
      actorId: ctx.user.id,
      action: 'submission.update',
      resourceType: 'submission',
      resourceId: subId,
      beforeJson: JSON.stringify({ status: before?.status, paymentStatus: before?.paymentStatus }),
      afterJson: JSON.stringify({ status: updated.status, paymentStatus: updated.paymentStatus }),
    },
  })

  return NextResponse.json({ data: updated })
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, subId } = await params
  const form = await db.form.findFirst({ where: { id, workspaceId: ctx.workspace.id } })
  if (!form) return NextResponse.json({ error: 'Form bulunamadı' }, { status: 404 })

  await db.submission.delete({ where: { id: subId } })
  await db.form.update({
    where: { id },
    data: {
      submissionCount: { decrement: 1 },
    },
  })

  return NextResponse.json({ data: { success: true } })
}
