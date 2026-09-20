'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api-client'
import type { DashboardData } from '@/lib/types'
import { useApp } from '@/lib/store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from 'recharts'
import {
  FileText,
  CheckCircle2,
  Inbox,
  Clock,
  AlertCircle,
  CreditCard,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowRight,
  Activity,
  Bell,
  Sparkles,
  Zap,
  Shield,
  Users,
  ExternalLink,
  Circle,
  CalendarDays,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  new: { label: 'Yeni', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
  reviewing: { label: 'İnceleniyor', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
  approved: { label: 'Onaylandı', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
  rejected: { label: 'Reddedildi', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10' },
  spam: { label: 'Spam', color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-500/10' },
  archived: { label: 'Arşiv', color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-500/10' },
  draft: { label: 'Taslak', color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-500/10' },
  published: { label: 'Yayında', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
  paused: { label: 'Durduruldu', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
}

function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  trendUp,
  color,
  delay,
  onClick,
}: {
  icon: any
  label: string
  value: string | number
  trend?: string
  trendUp?: boolean
  color: string
  delay: number
  onClick?: () => void
}) {
  return (
    <Card
      className="p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary group relative overflow-hidden animate-in-fade"
      style={{ animationDelay: `${delay}ms` }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(event) => {
        if ((event.key === 'Enter' || event.key === ' ') && onClick) {
          event.preventDefault()
          onClick()
        }
      }}
    >
      <div className={cn('absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity', color)} />
      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', color)}>
            <Icon className="w-5 h-5" />
          </div>
          {trend && (
            <Badge
              variant="outline"
              className={cn(
                'gap-1 font-medium',
                trendUp ? 'text-emerald-600 border-emerald-200 dark:border-emerald-900' : 'text-red-600 border-red-200 dark:border-red-900'
              )}
            >
              {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {trend}
            </Badge>
          )}
        </div>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        <div className="text-xs text-muted-foreground mt-1 flex items-center justify-between">
          <span>{label}</span>
          <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </Card>
  )
}

function ActivityIcon({ action }: { action: string }) {
  const map: Record<string, { icon: any; color: string }> = {
    'form.create': { icon: FileText, color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
    'form.update': { icon: FileText, color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
    'form.publish': { icon: CheckCircle2, color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
    'form.delete': { icon: FileText, color: 'bg-red-500/10 text-red-600 dark:text-red-400' },
    'form.duplicate': { icon: FileText, color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400' },
    'submission.update': { icon: Activity, color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
    'theme.update': { icon: Sparkles, color: 'bg-pink-500/10 text-pink-600 dark:text-pink-400' },
    'integration.connect': { icon: Zap, color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400' },
  }
  const cfg = map[action] || { icon: Circle, color: 'bg-gray-500/10 text-gray-600' }
  const Icon = cfg.icon
  return (
    <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', cfg.color)}>
      <Icon className="w-3.5 h-3.5" />
    </div>
  )
}

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    'form.create': 'Form oluşturuldu',
    'form.update': 'Form güncellendi',
    'form.publish': 'Form yayınlandı',
    'form.delete': 'Form silindi',
    'form.duplicate': 'Form çoğaltıldı',
    'submission.update': 'Yanıt güncellendi',
    'theme.update': 'Tema güncellendi',
    'integration.connect': 'Entegrasyon bağlandı',
  }
  return map[action] || action
}

const alertConfig: Record<string, { icon: any; color: string }> = {
  warning: { icon: AlertCircle, color: 'text-amber-500' },
  info: { icon: Bell, color: 'text-blue-500' },
  success: { icon: CheckCircle2, color: 'text-emerald-500' },
  error: { icon: AlertCircle, color: 'text-red-500' },
}

export function DashboardView() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [eventCount, setEventCount] = useState<number | null>(null)
  const [eventsFailed, setEventsFailed] = useState(false)
  const { setView, selectForm } = useApp()

  useEffect(() => {
    let mounted = true
    api<Array<{ id: string }>>('/api/events')
      .then((rows) => mounted && setEventCount(Array.isArray(rows) ? rows.length : 0))
      .catch(() => mounted && setEventsFailed(true))
    api<DashboardData>('/api/dashboard')
      .then((d) => mounted && setData(d))
      .catch(() => {})
      .finally(() => mounted && setLoading(false))
    return () => {
      mounted = false
    }
  }, [])

  if (loading || !data) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-5 h-32">
              <div className="shimmer h-full w-full rounded" />
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 h-80 p-5">
            <div className="shimmer h-full w-full rounded" />
          </Card>
          <Card className="h-80 p-5">
            <div className="shimmer h-full w-full rounded" />
          </Card>
        </div>
      </div>
    )
  }

  const stats = data.stats

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Welcome Banner */}
      <Card className="p-6 bg-gradient-to-br from-primary/10 via-background to-chart-3/5 border-primary/20 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-chart-3/10 rounded-full blur-3xl translate-y-1/2" />
        <div className="relative flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Hoş geldiniz
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              Bugün {stats.todaySubmissions} yeni yanıt aldınız
            </h2>
            <p className="text-sm text-muted-foreground">
              {stats.pendingApprovals} onay bekleyen yanıt var. İş akışınızı kontrol edin.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setView('reports')} className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Raporları Gör
            </Button>
            <Button size="sm" className="gap-2" aria-label="Yeni Etkinlik oluştur" onClick={() => { try { sessionStorage.setItem('mavenforms:new-event-pending', '1') } catch {}; setView('events'); window.dispatchEvent(new CustomEvent('mavenforms:new-event')) }}>
              <CalendarDays className="w-4 h-4" />
              Yeni Etkinlik
            </Button>
          </div>
        </div>
      </Card>

      {/* No-event empty state (event-first entry) */}
      {data && eventCount === 0 && !eventsFailed ? (
        <Card className="p-6 border-primary/20" data-testid="dashboard-no-event">
          <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <div className="space-y-1">
              <h3 className="font-semibold">Henüz etkinliğiniz yok</h3>
              <p className="text-sm text-muted-foreground">Başlamak için ilk etkinliği oluşturun; kayıt formu, kayıtlar, ödeme, yaka kartı, check-in ve floor plan seçili etkinlikte çalışır.</p>
            </div>
            <Button className="gap-2 shrink-0" aria-label="İlk etkinliği oluştur" onClick={() => { try { sessionStorage.setItem('mavenforms:new-event-pending', '1') } catch {}; setView('events'); window.dispatchEvent(new CustomEvent('mavenforms:new-event')) }}>
              <CalendarDays className="w-4 h-4" />
              İlk Etkinliği Oluştur
            </Button>
          </div>
        </Card>
      ) : null}
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          icon={FileText}
          label="Toplam Form"
          value={stats.totalForms}
          color="bg-violet-500/10 text-violet-600 dark:text-violet-400"
          delay={0}
          onClick={() => setView('forms')}
        />
        <StatCard
          icon={CheckCircle2}
          label="Yayındaki Form"
          value={stats.publishedForms}
          color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          delay={50}
          onClick={() => setView('forms')}
        />
        <StatCard
          icon={Inbox}
          label="Bugünkü Yanıt"
          value={stats.todaySubmissions}
          color="bg-blue-500/10 text-blue-600 dark:text-blue-400"
          delay={100}
          onClick={() => setView('submissions')}
        />
        <StatCard
          icon={Clock}
          label="Bekleyen Onay"
          value={stats.pendingApprovals}
          color="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          delay={150}
          onClick={() => setView('submissions')}
        />
        <StatCard
          icon={AlertCircle}
          label="Başarısız Bildirim"
          value={stats.failedNotifications}
          color="bg-red-500/10 text-red-600 dark:text-red-400"
          delay={200}
          onClick={() => setView('settings')}
        />
        <StatCard
          icon={CreditCard}
          label="Bu Ay Ödeme"
          value={stats.paymentTotal === null ? '—' : `₺${stats.paymentTotal.toLocaleString('tr-TR')}`}
          color="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
          delay={250}
          onClick={() => setView('reports')}
        />
      </div>

      {/* Charts & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Chart */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold">Yanıt Trendi</h3>
              <p className="text-xs text-muted-foreground">Son 14 gün</p>
            </div>
            <div className="flex gap-1.5">
              <Badge variant="outline" className="gap-1">
                <Circle className="w-2 h-2 fill-primary text-primary" />
                Yanıtlar
              </Badge>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data.trend}>
              <defs>
                <linearGradient id="colorResp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                axisLine={false}
                tickLine={false}
                interval={1}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                axisLine={false}
                tickLine={false}
                width={30}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--popover)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: 'var(--foreground)', fontWeight: 600 }}
              />
              <Area
                type="monotone"
                dataKey="count"
                name="Yanıtlar"
                stroke="var(--primary)"
                strokeWidth={2.5}
                fill="url(#colorResp)"
                dot={{ fill: 'var(--primary)', r: 3 }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Status Distribution */}
        <Card className="p-6">
          <div className="mb-6">
            <h3 className="font-semibold">Form Durumları</h3>
            <p className="text-xs text-muted-foreground">Workspace dağılımı</p>
          </div>
          <div className="space-y-3">
            {[
              { status: 'published', label: 'Yayında', color: 'bg-emerald-500' },
              { status: 'draft', label: 'Taslak', color: 'bg-gray-400' },
              { status: 'paused', label: 'Durduruldu', color: 'bg-amber-500' },
              { status: 'archived', label: 'Arşiv', color: 'bg-gray-300' },
            ].map((s) => {
              const found = data.statusDistribution.find((d) => d.status === s.status)
              const count = found?._count || 0
              const total = data.statusDistribution.reduce((a, b) => a + b._count, 0) || 1
              const pct = (count / total) * 100
              return (
                <div key={s.status} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className={cn('w-2 h-2 rounded-full', s.color)} />
                      {s.label}
                    </span>
                    <span className="text-muted-foreground">{count}</span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>
              )
            })}
          </div>

          <div className="mt-6 pt-6 border-t border-border space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium">Sistem Sağlığı</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-muted/50 p-2.5">
                <div className="text-muted-foreground">API</div>
                <div className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Çalışıyor
                </div>
              </div>
              <div className="rounded-lg bg-muted/50 p-2.5">
                <div className="text-muted-foreground">Veritabanı</div>
                <div className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Sağlıklı
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-border/60 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium">
                <span>E-posta teslimatı</span>
                <span className="text-muted-foreground">{data.deliverability.deliveryRatePercent === null ? 'Kanıt yok' : `%${data.deliverability.deliveryRatePercent} teslim`}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <span>Kabul edildi: <strong className="text-foreground">{data.deliverability.accepted}</strong></span>
                <span>Teslim edildi: <strong className="text-foreground">{data.deliverability.delivered}</strong></span>
                <span>Bekleyen: <strong className="text-foreground">{data.deliverability.queued + data.deliverability.sending}</strong></span>
                <span>Hatalı: <strong className="text-foreground">{data.deliverability.failed}</strong></span>
              </div>
              {data.deliverability.marketingPaused && <div className="text-[10px] text-amber-600">Marketing gönderimleri duraklatıldı.</div>}
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Forms & Submissions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Forms */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Son Formlar</h3>
              <p className="text-xs text-muted-foreground">Son güncellenen 5 form</p>
            </div>
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setView('forms')}>
              Tümü <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
          <div className="space-y-2">
            {data.recentForms.map((form) => {
              const cfg = statusConfig[form.status] || statusConfig.draft
              return (
                <button
                  key={form.id}
                  onClick={() => selectForm(form.id, 'submissions')}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left group"
                >
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/15 to-chart-3/10 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{form.title}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium', cfg.bg, cfg.color)}>
                        {cfg.label}
                      </span>
                      <span>{form.submissionCount} yanıt</span>
                      <span>·</span>
                      <span>{new Date(form.updatedAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}</span>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-1">
                    {form.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag.id}
                        className="text-[10px] px-1.5 py-0.5 rounded-full font-medium border"
                        style={{
                          backgroundColor: `${tag.color}15`,
                          color: tag.color,
                          borderColor: `${tag.color}30`,
                        }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )
            })}
          </div>
        </Card>

        {/* Recent Submissions */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Son Yanıtlar</h3>
              <p className="text-xs text-muted-foreground">Son 5 yanıt</p>
            </div>
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setView('submissions')} aria-label="Tüm yanıtları gör" title="Tüm yanıtları gör">
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
          <div className="space-y-2">
            {data.recentSubmissions.slice(0, 5).map((sub) => {
              const cfg = statusConfig[sub.status] || statusConfig.new
              return (
                <div
                  key={sub.id}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0', cfg.bg, cfg.color)}>
                    {(sub.name || '?')[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{sub.name || 'Anonim'}</div>
                    <div className="text-xs text-muted-foreground truncate">{sub.form.title}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={cn('inline-flex items-center px-1 py-0.5 rounded text-[9px] font-medium', cfg.bg, cfg.color)}>
                        {cfg.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(sub.submittedAt).toLocaleDateString('tr-TR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {/* Activity & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Feed */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <h3 className="font-semibold">Aktivite Akışı</h3>
            </div>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => useApp.getState().setView('audit')}>
              Tümü
            </Button>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {data.activityFeed.map((a, i) => (
              <div key={a.id} className="flex items-start gap-3">
                <ActivityIcon action={a.action} />
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="text-sm">
                    <span className="font-medium">{a.actor?.name || 'Sistem'}</span>{' '}
                    <span className="text-muted-foreground">{actionLabel(a.action).toLowerCase()}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {new Date(a.createdAt).toLocaleString('tr-TR', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* System Alerts */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <h3 className="font-semibold">Sistem Uyarıları</h3>
            </div>
            <Badge variant="outline" className="text-[10px]">
              {data.systemAlerts.length} bildirim
            </Badge>
          </div>
          <div className="space-y-3">
            {data.systemAlerts.map((alert) => {
              const cfg = alertConfig[alert.level]
              const Icon = cfg.icon
              return (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border/60 hover:border-border hover:bg-muted/30 transition-colors"
                >
                  <Icon className={cn('w-4 h-4 mt-0.5 shrink-0', cfg.color)} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{alert.title}</div>
                    <div className="text-xs text-muted-foreground">{alert.description}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">{alert.time}</div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-6 pt-6 border-t border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Takım</span>
              </div>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => useApp.getState().setView('users')}>
                Yönet
              </Button>
            </div>
            <div className="flex items-center gap-1">
              <div className="flex -space-x-2">
                {['DK', 'AY', 'MD', 'FS', '+3'].map((initial, i) => (
                  <Avatar key={i} className="w-7 h-7 border-2 border-background">
                    <AvatarFallback className={cn(
                      'text-[10px] font-semibold',
                      i === 4 ? 'bg-muted text-muted-foreground' : 'bg-gradient-to-br from-primary to-chart-3 text-primary-foreground'
                    )}>
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <span className="ml-2 text-xs text-muted-foreground">7 aktif üye</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
