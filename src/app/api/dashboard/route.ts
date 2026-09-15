import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionFromCookie } from '@/lib/auth'
import { can } from '@/lib/policy'
import { buildEmailDeliverabilityMetrics } from '@/lib/email-deliverability-metrics'

function readSubmissionValue(valueJson: string | null): string | null {
  try {
    const parsed = JSON.parse(valueJson || '{}')
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || typeof parsed.value !== 'string') return null
    return parsed.value.slice(0, 320)
  } catch {
    return null
  }
}

export async function GET() {
  const ctx = await getSessionFromCookie()
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const _auth = can.readReports(ctx as any)
  if (!_auth.allowed) return NextResponse.json({ error: _auth.error }, { status: _auth.status })

  const workspaceId = ctx.workspace.id

  const [emailOutbox, emailProviderEvents, emailProtection] = await Promise.all([
    db.outboxEvent.findMany({ where: { workspaceId, type: 'email' }, select: { status: true } }),
    db.emailProviderEvent.findMany({ where: { workspaceId }, select: { eventType: true, processingStatus: true } }),
    db.workspaceEmailProtection.findUnique({ where: { workspaceId }, select: { marketingPaused: true } }),
  ])
  const deliverability = buildEmailDeliverabilityMetrics({
    outbox: emailOutbox,
    providerEvents: emailProviderEvents,
    marketingPaused: emailProtection?.marketingPaused === true,
  })

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

  const failedNotifications = deliverability.failed

  // PaymentOrder is not yet the authoritative source for dashboard totals.
  // Do not derive money from submission labels or hardcoded ticket prices.
  const paymentTotal = null

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
  const trendDays: Array<{ date: string; label: string; count: number }> = []
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

  const systemAlerts = [
    ...(deliverability.marketingPaused ? [{ id: 'email-marketing-paused', level: 'warning' as const, title: 'Pazarlama gönderimleri duraklatıldı', description: 'Complaint koruması nedeniyle yeni marketing e-postaları gönderilmiyor.', time: 'Şimdi' }] : []),
    ...(deliverability.failed > 0 ? [{ id: 'email-delivery-failures', level: 'error' as const, title: 'E-posta teslimat hataları var', description: `${deliverability.failed} e-posta kuyruğu kaydı başarısız veya durdurulmuş durumda.`, time: 'Şimdi' }] : []),
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
      deliverability,
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
          name: formField ? readSubmissionValue(formField.valueJson) || 'Anonim' : 'Anonim',
          email: emailField ? readSubmissionValue(emailField.valueJson) : null,
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
