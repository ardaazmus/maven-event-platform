import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'
import { db } from '@/lib/db'
import { createXlsx, XLSX_MIME } from '@/lib/xlsx-export'

interface RouteParams { params: Promise<{ id: string }> }

// GET /api/forms/:id/export?format=csv|xlsx — real file, not toast (M07.4)
export async function GET(req: NextRequest, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const auth = can.readSubmissions(ctx as any)
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { id } = await params
  const form = await db.form.findFirst({ where: { id, workspaceId: ctx.workspace.id } })
  if (!form) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { searchParams } = new URL(req.url)
  const format = searchParams.get('format') || 'csv'
  if (!['csv', 'xlsx'].includes(format)) return NextResponse.json({ error: 'Unsupported format' }, { status: 400 })

  const submissions = await db.submission.findMany({
    where: { formId: id },
    include: { values: { include: { field: true } } },
    orderBy: { submittedAt: 'desc' },
    take: 1000, // ponytail: paginated stream when >1000
  })
  const fields = await db.formField.findMany({ where: { formId: id }, orderBy: { sortOrder: 'asc' } })
  const headers = ['submittedAt', 'status', ...fields.map(f => f.fieldKey)]
  const rows = submissions.map(s => {
    const byKey = new Map(s.values.map(v => [v.field.fieldKey, v.normalizedText || '']))
    return [s.submittedAt.toISOString(), s.status, ...fields.map(f => byKey.get(f.fieldKey) || '')]
  })
  const csvCell = (value: string) => `"${value.replace(/"/g, '""')}"`
  const csv = [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\n')
  if (format === 'xlsx') {
    const workbook = createXlsx(headers, rows)
    return new NextResponse(workbook, {
      status: 200,
      headers: {
        'Content-Type': XLSX_MIME,
        'Content-Disposition': `attachment; filename="${form.slug}-${new Date().toISOString().slice(0,10)}.xlsx"`,
      },
    })
  }
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${form.slug}-${new Date().toISOString().slice(0,10)}.csv"`,
    },
  })
}
