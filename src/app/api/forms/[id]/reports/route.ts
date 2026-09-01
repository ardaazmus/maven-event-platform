import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(req: Request, { params }: RouteParams) {
  const ctx = await getSessionFromCookie()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const form = await db.form.findFirst({ where: { id, workspaceId: ctx.workspace.id } })
  if (!form) return NextResponse.json({ error: 'Form bulunamadı' }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const days = parseInt(searchParams.get('days') || '30')

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  // Total submissions in period
  const totalSubmissions = await db.submission.count({
    where: { formId: id, submittedAt: { gte: startDate } },
  })

  // Status distribution
  const statusDist = await db.submission.groupBy({
    by: ['status'],
    where: { formId: id },
    _count: true,
  })

  // Daily trend
  const trend = []
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = new Date()
    dayStart.setDate(dayStart.getDate() - i)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(dayStart)
    dayEnd.setDate(dayEnd.getDate() + 1)
    const count = await db.submission.count({
      where: { formId: id, submittedAt: { gte: dayStart, lt: dayEnd } },
    })
    trend.push({
      date: dayStart.toISOString().split('T')[0],
      label: dayStart.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }),
      count,
    })
  }

  // Field distribution for select/radio/checkbox fields
  const fields = await db.formField.findMany({
    where: { formId: id, type: { in: ['select', 'radio', 'checkbox'] } },
  })
  
  const fieldDistributions = []
  for (const field of fields) {
    const values = await db.submissionValue.findMany({
      where: { fieldId: field.id, submission: { formId: id } },
      select: { normalizedText: true },
    })
    const counts: Record<string, number> = {}
    for (const v of values) {
      const val = v.normalizedText
      if (val) counts[val] = (counts[val] || 0) + 1
    }
    fieldDistributions.push({
      fieldId: field.id,
      fieldKey: field.fieldKey,
      label: field.label,
      type: field.type,
      distribution: Object.entries(counts).map(([value, count]) => ({ value, count })),
    })
  }

  // Rating averages for rating fields
  const ratingFields = await db.formField.findMany({
    where: { formId: id, type: 'rating' },
  })
  const ratingAverages = []
  for (const field of ratingFields) {
    const values = await db.submissionValue.findMany({
      where: { fieldId: field.id, submission: { formId: id } },
      select: { normalizedText: true },
    })
    const nums = values.map(v => parseInt(v.normalizedText || '0')).filter(n => !isNaN(n))
    const avg = nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0
    ratingAverages.push({
      fieldId: field.id,
      fieldKey: field.fieldKey,
      label: field.label,
      average: parseFloat(avg.toFixed(2)),
      count: nums.length,
    })
  }

  // Source distribution
  const sourceDist = await db.submission.groupBy({
    by: ['source'],
    where: { formId: id },
    _count: true,
  })

  // Payment stats
  const paymentStats = await db.submission.groupBy({
    by: ['paymentStatus'],
    where: { formId: id },
    _count: true,
  })

  return NextResponse.json({
    data: {
      totalSubmissions,
      statusDistribution: statusDist,
      trend,
      fieldDistributions,
      ratingAverages,
      sourceDistribution: sourceDist,
      paymentStats,
    },
  })
}
