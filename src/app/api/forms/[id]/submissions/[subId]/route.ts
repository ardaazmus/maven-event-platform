import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'

interface RouteParams {
  params: Promise<{ id: string; subId: string }>
}

function parseSubmissionValue(valueJson: string | null) {
  try {
    return JSON.parse(valueJson || '{}')
  } catch {
    return { value: null }
  }
}

const updateSubmissionSchema = z.object({
  status: z.enum(['new', 'reviewing', 'approved', 'rejected', 'spam', 'archived']).optional(),
  paymentStatus: z.enum(['pending', 'authorized', 'paid', 'failed', 'refunded', 'partially_refunded']).nullable().optional(),
}).strict().refine((value) => value.status !== undefined || value.paymentStatus !== undefined, {
  message: 'Güncellenecek bir durum alanı gereklidir',
})

export async function GET(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const _auth = can.readSubmissions(ctx as any)
  if (!_auth.allowed) return NextResponse.json({ error: _auth.error }, { status: _auth.status })

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
        value: parseSubmissionValue(v.valueJson),
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

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON gövdesi' }, { status: 400 })
  }
  const parsed = updateSubmissionSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Geçersiz yanıt durum güncellemesi' }, { status: 400 })
  const data = parsed.data
  const auth = data.status === undefined
    ? can.updateSubmissionPayment(ctx as any)
    : can.updateSubmissions(ctx as any)
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const updated = await db.$transaction(async (tx) => {
    const before = await tx.submission.findFirst({ where: { id: subId, formId: id } })
    if (!before) return null

    const next = await tx.submission.update({ where: { id: subId }, data })
    await tx.auditLog.create({
      data: {
        workspaceId: ctx.workspace.id,
        actorId: ctx.user.id,
        action: 'submission.update',
        resourceType: 'submission',
        resourceId: subId,
        beforeJson: JSON.stringify({ status: before.status, paymentStatus: before.paymentStatus }),
        afterJson: JSON.stringify({ status: next.status, paymentStatus: next.paymentStatus }),
      },
    })
    return next
  })

  if (!updated) return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 })

  return NextResponse.json({ data: updated })
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const _auth = can.deleteSubmissions(ctx as any)
  if (!_auth.allowed) return NextResponse.json({ error: _auth.error }, { status: _auth.status })

  const { id, subId } = await params
  const form = await db.form.findFirst({ where: { id, workspaceId: ctx.workspace.id } })
  if (!form) return NextResponse.json({ error: 'Form bulunamadı' }, { status: 404 })

  const deleted = await db.$transaction(async (tx) => {
    const existing = await tx.submission.findFirst({ where: { id: subId, formId: id } })
    if (!existing) return false

    await tx.submission.delete({ where: { id: subId } })
    await tx.form.update({
      where: { id: existing.formId },
      data: {
        submissionCount: { decrement: 1 },
      },
    })
    return true
  })

  if (!deleted) return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 })

  return NextResponse.json({ data: { success: true } })
}
