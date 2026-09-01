'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api-client'
import type { FormListItem } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  Legend,
} from 'recharts'
import {
  FileText,
  TrendingUp,
  Users,
  CreditCard,
  Star,
  Clock,
  Globe,
  Download,
  Share2,
  Calendar,
  Filter,
  PieChart as PieIcon,
  BarChart3,
  Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const COLORS = ['#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899']

interface ReportData {
  totalSubmissions: number
  statusDistribution: Array<{ status: string; _count: number }>
  trend: Array<{ date: string; label: string; count: number }>
  fieldDistributions: Array<{
    fieldId: string
    fieldKey: string
    label: string
    type: string
    distribution: Array<{ value: string; count: number }>
  }>
  ratingAverages: Array<{
    fieldId: string
    fieldKey: string
    label: string
    average: number
    count: number
  }>
  sourceDistribution: Array<{ source: string; _count: number }>
  paymentStats: Array<{ paymentStatus: string; _count: number }>
}

export function ReportsView() {
  const [forms, setForms] = useState<FormListItem[]>([])
  const [selectedForm, setSelectedForm] = useState<string | null>(null)
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)

  useEffect(() => {
    api<FormListItem[]>('/api/forms').then((f) => {
      setForms(f)
      if (f.length > 0 && !selectedForm) setSelectedForm(f[0].id)
    })
  }, [])

  useEffect(() => {
    if (!selectedForm) return
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const d = await api<ReportData>(`/api/forms/${selectedForm}/reports?days=${days}`)
        if (!cancelled) setData(d)
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [selectedForm, days])

  const selectedFormObj = forms.find((f) => f.id === selectedForm)

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold mb-1">Raporlar & Analiz</h2>
          <p className="text-sm text-muted-foreground">Form performansını ve yanıtları analiz edin</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={selectedForm || ''} onValueChange={setSelectedForm}>
            <SelectTrigger className="w-full sm:w-64 gap-2">
              <FileText className="w-4 h-4" />
              <SelectValue placeholder="Form seçin" />
            </SelectTrigger>
            <SelectContent>
              {forms.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(days)} onValueChange={(v) => setDays(parseInt(v))}>
            <SelectTrigger className="w-32 gap-2">
              <Calendar className="w-4 h-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Son 7 gün</SelectItem>
              <SelectItem value="14">Son 14 gün</SelectItem>
              <SelectItem value="30">Son 30 gün</SelectItem>
              <SelectItem value="90">Son 90 gün</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Share2 className="w-3.5 h-3.5" /> Paylaş
          </Button>
        </div>
      </div>

      {loading || !data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-5 h-28">
              <div className="shimmer h-full w-full rounded" />
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
                <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200 dark:border-emerald-900">
                  +{data.trend.slice(-7).reduce((a, b) => a + b.count, 0) > 0 ? Math.round((data.trend.slice(-7).reduce((a, b) => a + b.count, 0) / Math.max(data.trend.slice(0, 7).reduce((a, b) => a + b.count, 0), 1)) * 100 - 100) : 0}%
                </Badge>
              </div>
              <div className="text-2xl font-bold">{data.totalSubmissions}</div>
              <div className="text-xs text-muted-foreground">Toplam Yanıt</div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold">
                {data.statusDistribution.find((s) => s.status === 'approved')?._count || 0}
              </div>
              <div className="text-xs text-muted-foreground">Onaylanan</div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold">
                {data.statusDistribution.filter((s) => ['new', 'reviewing'].includes(s.status)).reduce((a, b) => a + b._count, 0)}
              </div>
              <div className="text-xs text-muted-foreground">Bekleyen</div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold">
                {data.paymentStats.find((p) => p.paymentStatus === 'paid')?._count || 0}
              </div>
              <div className="text-xs text-muted-foreground">Ödenen</div>
            </Card>
          </div>

          {/* Trend Chart */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold">Yanıt Trendi</h3>
                <p className="text-xs text-muted-foreground">Son {days} gün</p>
              </div>
              <Badge variant="outline" className="gap-1">
                <TrendingUp className="w-3 h-3" />
                {data.trend.reduce((a, b) => a + b.count, 0)} toplam
              </Badge>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.trend}>
                <defs>
                  <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} interval={Math.floor(days / 7)} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} width={30} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--popover)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
                <Area type="monotone" dataKey="count" name="Yanıtlar" stroke="var(--primary)" strokeWidth={2.5} fill="url(#colorTrend)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Distribution */}
            <Card className="p-6">
              <div className="mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-primary" />
                  Durum Dağılımı
                </h3>
                <p className="text-xs text-muted-foreground">Yanıt durumları</p>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={data.statusDistribution.map((s) => ({ name: s.status, value: s._count }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${value}`}
                  >
                    {data.statusDistribution.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'var(--popover)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-3">
                {data.statusDistribution.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="capitalize">{s.status}</span>
                    <span className="text-muted-foreground ml-auto">{s._count}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Source Distribution */}
            <Card className="p-6">
              <div className="mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" />
                  Kaynak Dağılımı
                </h3>
                <p className="text-xs text-muted-foreground">Yanıtlar nereden geldi</p>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.sourceDistribution.map((s) => ({ name: s.source, value: s._count }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--popover)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="value" name="Yanıt" radius={[4, 4, 0, 0]}>
                    {data.sourceDistribution.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Field Distributions */}
          {data.fieldDistributions.length > 0 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-1">Alan Dağılımları</h3>
                <p className="text-sm text-muted-foreground">Seçim alanlarının dağılımı</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {data.fieldDistributions.map((field) => (
                  <Card key={field.fieldId} className="p-6">
                    <h4 className="font-medium mb-4">{field.label}</h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={field.distribution} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="value" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} width={80} />
                        <Tooltip contentStyle={{ backgroundColor: 'var(--popover)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
                        <Bar dataKey="count" name="Sayı" radius={[0, 4, 4, 0]}>
                          {field.distribution.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Rating Averages */}
          {data.ratingAverages.length > 0 && (
            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500" />
                Değerlendirme Ortalamaları
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.ratingAverages.map((r) => (
                  <div key={r.fieldId} className="rounded-lg border border-border p-4">
                    <div className="text-sm font-medium mb-2">{r.label}</div>
                    <div className="flex items-center gap-3">
                      <div className="text-3xl font-bold text-amber-500">{r.average.toFixed(1)}</div>
                      <div className="flex flex-col">
                        <div className="flex gap-0.5">
                          {[...Array(10)].map((_, i) => (
                            <Star
                              key={i}
                              className={cn('w-3 h-3', i < Math.round(r.average) ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground/30')}
                            />
                          ))}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">{r.count} yanıt</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Payment Stats */}
          {data.paymentStats.length > 0 && (
            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" />
                Ödeme İstatistikleri
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {data.paymentStats.map((p, i) => (
                  <div key={i} className="rounded-lg border border-border p-3">
                    <div className="text-2xl font-bold">{p._count}</div>
                    <div className="text-xs text-muted-foreground capitalize">{p.paymentStatus || 'Yok'}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
