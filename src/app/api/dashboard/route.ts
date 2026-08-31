import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'

export async function GET() {
  const ctx = await getSessionFromCookie()
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const workspaceId = ctx.workspace.id

  // Total forms
  const totalForms = await db.form.count({
    where: { workspaceId, deletedAt: null },
  })

  // Published forms
  const publishedForms = await db.form.count({
    where: { workspaceId, status: 'published', deletedAt: null },
  })

  // Today's submissions
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todaySubmissions = await db.submission.count({
    where: {
      form: { workspaceId },
      submittedAt: { gte: todayStart },
    },
  })

  // Pending approvals (reviewing status)
  const pendingApprovals = await db.submission.count({
    where: {
      form: { workspaceId },
      status: { in: ['new', 'reviewing'] },
    },
  })

  // Failed notifications (mock - we don't track delivery status here)
  const failedNotifications = 2

  // Payment total this month
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  const paidSubmissions = await db.submission.findMany({
    where: {
      form: { workspaceId },
      paymentStatus: 'paid',
      submittedAt: { gte: monthStart },
    },
    select: { formId: true, values: { where: { field: { type: 'select' } } } },
  })
  // Estimate payment total - VIP=1500, Standard=500, Student=250
  let paymentTotal = 0
  for (const sub of paidSubmissions) {
    const ticketField = sub.values.find(v => true)
    if (ticketField) {
      const val = JSON.parse(ticketField.valueJson || '{}').value
      if (val === 'vip') paymentTotal += 1500
      else if (val === 'standard') paymentTotal += 500
      else if (val === 'student') paymentTotal += 250
    } else {
      paymentTotal += 500 // default
    }
  }

  // Recent forms (5)
  const recentForms = await db.form.findMany({
    where: { workspaceId, deletedAt: null },
    orderBy: { updatedAt: 'desc' },
    take: 5,
    include: {
      folder: true,
      tags: { include: { tag: true } },
    },
  })

  // Recent submissions (10)
  const recentSubmissions = await db.submission.findMany({
    where: { form: { workspaceId } },
    orderBy: { submittedAt: 'desc' },
    take: 10,
    include: {
      form: { select: { id: true, title: true, slug: true } },
      values: { include: { field: true } },
    },
  })

  // Activity feed (audit logs, 10)
  const activityFeed = await db.auditLog.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { actor: { select: { id: true, name: true, email: true } } },
  })

  // 14-day submission trend
  const trendDays = []
  for (let i = 13; i >= 0; i--) {
    const dayStart = new Date()
    dayStart.setDate(dayStart.getDate() - i)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(dayStart)
    dayEnd.setDate(dayEnd.getDate() + 1)
    
    const count = await db.submission.count({
      where: {
        form: { workspaceId },
        submittedAt: { gte: dayStart, lt: dayEnd },
      },
    })
    trendDays.push({
      date: dayStart.toISOString().split('T')[0],
      label: dayStart.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }),
      count,
    })
  }

  // Form status distribution
  const statusCounts = await db.form.groupBy({
    by: ['status'],
    where: { workspaceId, deletedAt: null },
    _count: true,
  })

  // System alerts (mock)
  const systemAlerts = [
    { id: '1', level: 'warning', title: 'Stripe API anahtarı yakında sona erecek', description: 'Test modunda 7 gün kaldı', time: '2 saat önce' },
    { id: '2', level: 'info', title: 'Yeni özellik: Çoklu dil desteği', description: 'Artık formlarınızı 3 dilde yayınlayabilirsiniz', time: '1 gün önce' },
    { id: '3', level: 'success', title: 'Yedekleme tamamlandı', description: 'Tüm form verileri güvenle yedeklendi', time: '3 saat önce' },
  ]

  return NextResponse.json({
    data: {
      stats: {
        totalForms,
        publishedForms,
        todaySubmissions,
        pendingApprovals,
        failedNotifications,
        paymentTotal,
      },
      recentForms: recentForms.map(f => ({
        id: f.id,
        title: f.title,
        slug: f.slug,
        status: f.status,
        folder: f.folder?.name,
        folderColor: f.folder?.color,
        tags: f.tags.map(ft => ({ id: ft.tag.id, name: ft.tag.name, color: ft.tag.color })),
        submissionCount: f.submissionCount,
        todaySubmissionCount: f.todaySubmissionCount,
        updatedAt: f.updatedAt,
        createdAt: f.createdAt,
      })),
      recentSubmissions: recentSubmissions.map(s => {
        const formField = s.values.find(v => v.field.type === 'text' || v.field.type === 'email')
        const emailField = s.values.find(v => v.field.type === 'email')
        return {
          id: s.id,
          status: s.status,
          paymentStatus: s.paymentStatus,
          submittedAt: s.submittedAt,
          source: s.source,
          form: s.form,
          name: formField ? JSON.parse(formField.valueJson || '{}').value : 'Anonim',
          email: emailField ? JSON.parse(emailField.valueJson || '{}').value : null,
        }
      }),
      activityFeed: activityFeed.map(a => ({
        id: a.id,
        action: a.action,
        resourceType: a.resourceType,
        resourceId: a.resourceId,
        actor: a.actor,
        createdAt: a.createdAt,
      })),
      trend: trendDays,
      statusDistribution: statusCounts,
      systemAlerts,
    },
  })
}
