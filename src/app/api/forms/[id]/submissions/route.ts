import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const _auth = can.readSubmissions(ctx as any)
  if (!_auth.allowed) return NextResponse.json({ error: _auth.error }, { status: _auth.status })

  const { id } = await params
  const form = await db.form.findFirst({ where: { id, workspaceId: ctx.workspace.id } })
  if (!form) return NextResponse.json({ error: 'Form bulunamadı' }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const page = Math.max(1, Math.min(10000, Number.parseInt(searchParams.get('page') || '1', 10) || 1))
  const pageSize = Math.max(1, Math.min(100, Number.parseInt(searchParams.get('pageSize') || '20', 10) || 20))
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
        value: (() => { try { return JSON.parse(v.valueJson || '{}') } catch { return { value: null } } })(),
        normalizedText: v.normalizedText,
        field: v.field,
      })),
    })),
    meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  })
}

// Public submission
export async function POST(req: NextRequest, { params }: RouteParams) {
  // Anonymous writes must use the slug-based public endpoint. Keeping an
  // internal-id write route would expose a second, harder-to-audit boundary.
  return NextResponse.json({ error: 'Public gönderim URLsi kullanılmalıdır' }, { status: 410 })
}
