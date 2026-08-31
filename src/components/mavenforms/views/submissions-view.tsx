'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api-client'
import type { Submission, SubmissionStatus, FormListItem } from '@/lib/types'
import { useApp } from '@/lib/store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useToast } from '@/hooks/use-toast'
import {
  Inbox,
  Search,
  Filter,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Archive,
  Trash2,
  Mail,
  FileText,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  CreditCard,
  Calendar,
  Globe,
  User,
  Tag,
  Loader2,
  Edit3,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  new: { label: 'Yeni', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10', icon: Inbox },
  reviewing: { label: 'İnceleniyor', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', icon: Clock },
  approved: { label: 'Onaylandı', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', icon: CheckCircle2 },
  rejected: { label: 'Reddedildi', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10', icon: XCircle },
  spam: { label: 'Spam', color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-500/10', icon: Archive },
  archived: { label: 'Arşiv', color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-500/10', icon: Archive },
}

const paymentConfig: Record<string, { label: string; color: string }> = {
  paid: { label: 'Ödendi', color: 'text-emerald-600 dark:text-emerald-400' },
  pending: { label: 'Bekliyor', color: 'text-amber-600 dark:text-amber-400' },
  failed: { label: 'Başarısız', color: 'text-red-600 dark:text-red-400' },
  refunded: { label: 'İade', color: 'text-gray-600 dark:text-gray-400' },
}

export function SubmissionsView() {
  const { selectedFormId, setView } = useApp()
  const [forms, setForms] = useState<FormListItem[]>([])
  const [selectedForm, setSelectedForm] = useState<string | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [selected, setSelected] = useState<Submission | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const { toast } = useToast()

  useEffect(() => {
    api<FormListItem[]>('/api/forms').then(setForms).catch(() => {})
  }, [])

  useEffect(() => {
    if (selectedFormId) {
      setSelectedForm(selectedFormId)
    } else if (forms.length > 0 && !selectedForm) {
      // Prefer published forms with submissions
      const publishedWithSubs = forms.find(f => f.status === 'published' && f.submissionCount > 0)
      const published = forms.find(f => f.status === 'published')
      setSelectedForm((publishedWithSubs || published || forms[0]).id)
    }
  }, [forms, selectedFormId, selectedForm])

  useEffect(() => {
    if (!selectedForm) return
    loadSubmissions()
  }, [selectedForm, page, statusFilter])

  useEffect(() => {
    const t = setTimeout(() => {
      if (selectedForm) loadSubmissions()
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  const loadSubmissions = async () => {
    if (!selectedForm) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('pageSize', '20')
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (search) params.set('search', search)
      const data = await api<{ data: Submission[]; meta: any }>(`/api/forms/${selectedForm}/submissions?${params.toString()}`)
      // The API returns data directly, not {data, meta}
      const subs = Array.isArray(data) ? data : (data as any).data || []
      const meta = (data as any).meta || { page: 1, totalPages: 1 }
      setSubmissions(subs)
      setTotalPages(meta.totalPages || 1)
    } catch (err: any) {
      toast({ title: 'Yanıtlar yüklenemedi', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (subId: string, status: SubmissionStatus) => {
    try {
      await api(`/api/forms/${selectedForm}/submissions/${subId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      toast({ title: 'Durum güncellendi', description: statusConfig[status]?.label })
      loadSubmissions()
      if (selected?.id === subId) setSelected({ ...selected, status })
    } catch (err: any) {
      toast({ title: 'Güncelleme hatası', description: err.message, variant: 'destructive' })
    }
  }

  const handleExport = (format: string) => {
    toast({ title: `${format.toUpperCase()} export başlatıldı`, description: 'İndirme linki e-posta ile gönderilecek' })
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Form selector sidebar */}
      <div className="hidden lg:flex w-60 shrink-0 border-r border-border bg-muted/20 flex-col">
        <div className="p-3 border-b border-border">
          <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => setView('forms')}>
            <FileText className="w-4 h-4" />
            Form Seç
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {forms.map((form) => (
            <button
              key={form.id}
              onClick={() => { setSelectedForm(form.id); setPage(1) }}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left',
                selectedForm === form.id
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'hover:bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="truncate">{form.title}</div>
                <div className="text-[10px] text-muted-foreground">{form.submissionCount} yanıt</div>
              </div>
              {form.todaySubmissionCount > 0 && (
                <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                  +{form.todaySubmissionCount}
                </Badge>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-border space-y-3 bg-background/80 backdrop-blur">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Yanıtlarda ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
              <SelectTrigger className="w-full sm:w-48 gap-2">
                <Filter className="w-3.5 h-3.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                <SelectItem value="new">Yeni</SelectItem>
                <SelectItem value="reviewing">İnceleniyor</SelectItem>
                <SelectItem value="approved">Onaylandı</SelectItem>
                <SelectItem value="rejected">Reddedildi</SelectItem>
                <SelectItem value="spam">Spam</SelectItem>
                <SelectItem value="archived">Arşiv</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  if (selectedForm) {
                    useApp.getState().selectForm(selectedForm, 'fields')
                    useApp.getState().setView('builder')
                  }
                }}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Düzenle</span>
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleExport('csv')}>
                <Download className="w-3.5 h-3.5" /> CSV
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 hidden sm:flex" onClick={() => handleExport('xlsx')}>
                <Download className="w-3.5 h-3.5" /> XLSX
              </Button>
            </div>
          </div>
        </div>

        {/* Submissions table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="p-4 space-y-2">
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="p-4 h-16">
                  <div className="shimmer h-full w-full rounded" />
                </Card>
              ))}
            </div>
          ) : submissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Inbox className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Yanıt bulunamadı</h3>
              <p className="text-sm text-muted-foreground">
                {search ? 'Arama kriterlerinize uygun yanıt yok.' : 'Henüz yanıt alınmadı.'}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden m-4">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">Başvuran</th>
                    <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground hidden md:table-cell">İletişim</th>
                    <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">Durum</th>
                    <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Ödeme</th>
                    <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Kaynak</th>
                    <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">Tarih</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {submissions.map((sub) => {
                    const cfg = statusConfig[sub.status] || statusConfig.new
                    const nameVal = sub.values.find((v) => v.field.type === 'text' || v.field.type === 'email')?.value?.value || 'Anonim'
                    const emailVal = sub.values.find((v) => v.field.type === 'email')?.value?.value
                    const StatusIcon = cfg.icon
                    return (
                      <tr
                        key={sub.id}
                        onClick={() => setSelected(sub)}
                        className="hover:bg-muted/30 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className={cn('text-xs font-semibold', cfg.bg, cfg.color)}>
                                {(nameVal as string)[0]?.toUpperCase() || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="font-medium truncate">{nameVal}</div>
                              <div className="text-xs text-muted-foreground">{sub.id.slice(-8)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          {emailVal ? (
                            <span className="text-xs text-muted-foreground">{emailVal}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium', cfg.bg, cfg.color)}>
                            <StatusIcon className="w-3 h-3" />
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          {sub.paymentStatus ? (
                            <span className={cn('text-xs font-medium', paymentConfig[sub.paymentStatus]?.color)}>
                              {paymentConfig[sub.paymentStatus]?.label}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground capitalize">
                            <Globe className="w-3 h-3" />
                            {sub.source}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {new Date(sub.submittedAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-border">
            <span className="text-xs text-muted-foreground">Sayfa {page} / {totalPages}</span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Önceki
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                className="gap-1"
              >
                Sonraki <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="sm:max-w-xl w-full overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-chart-3 text-primary-foreground text-xs font-semibold">
                      {(selected.values.find((v) => v.field.type === 'text')?.value?.value as string)?.[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div>{selected.values.find((v) => v.field.type === 'text')?.value?.value || 'Anonim'}</div>
                    <div className="text-xs text-muted-foreground font-normal">{selected.id}</div>
                  </div>
                </SheetTitle>
              </SheetHeader>

              <div className="p-4 space-y-6">
                {/* Status & Actions */}
                <Card className="p-4">
                  <Label className="text-xs text-muted-foreground mb-2 block">Durum</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(statusConfig).map(([key, cfg]) => (
                      <button
                        key={key}
                        onClick={() => updateStatus(selected.id, key as SubmissionStatus)}
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all',
                          selected.status === key ? `${cfg.bg} ${cfg.color} ring-2 ring-current/20` : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        )}
                      >
                        <cfg.icon className="w-3 h-3" />
                        {cfg.label}
                      </button>
                    ))}
                  </div>
                </Card>

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg bg-muted/50 p-3">
                    <div className="text-muted-foreground flex items-center gap-1 mb-1">
                      <Calendar className="w-3 h-3" /> Tarih
                    </div>
                    <div className="font-medium">{new Date(selected.submittedAt).toLocaleString('tr-TR')}</div>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <div className="text-muted-foreground flex items-center gap-1 mb-1">
                      <Globe className="w-3 h-3" /> Kaynak
                    </div>
                    <div className="font-medium capitalize">{selected.source}</div>
                  </div>
                  {selected.paymentStatus && (
                    <div className="rounded-lg bg-muted/50 p-3">
                      <div className="text-muted-foreground flex items-center gap-1 mb-1">
                        <CreditCard className="w-3 h-3" /> Ödeme
                      </div>
                      <div className={cn('font-medium', paymentConfig[selected.paymentStatus]?.color)}>
                        {paymentConfig[selected.paymentStatus]?.label}
                      </div>
                    </div>
                  )}
                  {selected.submitter && (
                    <div className="rounded-lg bg-muted/50 p-3">
                      <div className="text-muted-foreground flex items-center gap-1 mb-1">
                        <User className="w-3 h-3" /> Kullanıcı
                      </div>
                      <div className="font-medium">{selected.submitter.name}</div>
                    </div>
                  )}
                </div>

                {/* Field values */}
                <div>
                  <h3 className="text-sm font-semibold mb-3">Yanıt Detayları</h3>
                  <div className="space-y-3">
                    {selected.values.map((val) => (
                      <div key={val.id} className="rounded-lg border border-border p-3">
                        <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {val.field.label}
                          {val.field.required && <span className="text-destructive">*</span>}
                        </div>
                        <div className="text-sm font-medium">
                          {typeof val.value.value === 'object'
                            ? JSON.stringify(val.value.value)
                            : String(val.value.value)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-border">
                  <Button variant="outline" size="sm" className="gap-1.5 flex-1">
                    <Mail className="w-3.5 h-3.5" /> E-posta
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5 flex-1">
                    <Download className="w-3.5 h-3.5" /> PDF
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
