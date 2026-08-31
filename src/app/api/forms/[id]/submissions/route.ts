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

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')
  const search = searchParams.get('search')

  const where: any = { formId: id }
  if (status && status !== 'all') where.status = status
  if (search) {
    where.values = {
      some: {
        normalizedText: { contains: search },
      },
    }
  }

  const [submissions, total] = await Promise.all([
    db.submission.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        values: { include: { field: true } },
        submitter: { select: { id: true, name: true, email: true } },
      },
    }),
    db.submission.count({ where }),
  ])

  return NextResponse.json({
    data: submissions.map(s => ({
      id: s.id,
      status: s.status,
      paymentStatus: s.paymentStatus,
      locale: s.locale,
      source: s.source,
      submittedAt: s.submittedAt,
      createdAt: s.createdAt,
      submitter: s.submitter,
      values: s.values.map(v => ({
        id: v.id,
        fieldId: v.fieldId,
        value: JSON.parse(v.valueJson || '{}'),
        normalizedText: v.normalizedText,
        field: v.field,
      })),
    })),
    meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  })
}

// Public submission
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id } = await params

  const form = await db.form.findFirst({
    where: { id, status: 'published', deletedAt: null },
    include: { fields: { where: { adminOnly: false } } },
  })

  if (!form) return NextResponse.json({ error: 'Form bulunamadı veya yayında değil' }, { status: 404 })

  try {
    const body = await req.json()

    // Idempotency check via publicToken or header
    const idempotencyKey = req.headers.get('Idempotency-Key')
    if (idempotencyKey) {
      const existing = await db.submission.findUnique({ where: { publicToken: idempotencyKey } })
      if (existing) {
        return NextResponse.json({ data: { id: existing.id, status: 'duplicate' } })
      }
    }

    const submission = await db.submission.create({
      data: {
        formId: id,
        publicToken: idempotencyKey || `sub_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`,
        status: 'new',
        locale: form.settingsJson ? JSON.parse(form.settingsJson).locale || 'tr' : 'tr',
        source: 'web',
        ipHash: req.headers.get('x-forwarded-for')?.split(',')[0] || null,
        userAgentHash: req.headers.get('user-agent') || null,
      },
    })

    // Save values
    const values: any[] = []
    for (const field of form.fields) {
      const v = body[field.fieldKey]
      if (v !== undefined && v !== null && v !== '') {
        values.push({
          submissionId: submission.id,
          fieldId: field.id,
          valueJson: JSON.stringify({ value: v }),
          normalizedText: typeof v === 'string' ? v : JSON.stringify(v),
        })
      }
    }

    if (values.length > 0) {
      await db.submissionValue.createMany({ data: values })
    }

    // Update form counter
    await db.form.update({
      where: { id },
      data: {
        submissionCount: { increment: 1 },
        todaySubmissionCount: { increment: 1 },
      },
    })

    const settings = JSON.parse(form.settingsJson || '{}')
    return NextResponse.json({
      data: {
        id: submission.id,
        successMessage: settings.successMessage || 'Formunuz başarıyla gönderildi. Teşekkürler!',
      },
    })
  } catch (e) {
    return NextResponse.json({ error: 'Gönderim hatası' }, { status: 500 })
  }
}
