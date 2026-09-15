'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api-client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FileText,
  CheckCircle2,
  Activity,
  Trash2,
  Copy,
  Palette,
  Zap,
  Shield,
  Search,
  Filter,
  Download,
  Circle,
  Edit3,
  Eye,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AuditEntry {
  id: string
  action: string
  resourceType: string
  resourceId: string
  actor: { id: string; name: string | null; email: string } | null
  before: any
  after: any
  createdAt: string
}

const actionConfig: Record<string, { label: string; icon: any; color: string }> = {
  'form.create': { label: 'Form Oluşturuldu', icon: FileText, color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  'form.update': { label: 'Form Güncellendi', icon: Edit3, color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  'form.publish': { label: 'Form Yayınlandı', icon: CheckCircle2, color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  'form.delete': { label: 'Form Silindi', icon: Trash2, color: 'bg-red-500/10 text-red-600 dark:text-red-400' },
  'form.duplicate': { label: 'Form Çoğaltıldı', icon: Copy, color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400' },
  'submission.update': { label: 'Yanıt Güncellendi', icon: Activity, color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  'theme.update': { label: 'Tema Güncellendi', icon: Palette, color: 'bg-pink-500/10 text-pink-600 dark:text-pink-400' },
  'integration.connect': { label: 'Entegrasyon Bağlandı', icon: Zap, color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400' },
}

export function AuditView() {
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('all')

  useEffect(() => {
    api<AuditEntry[]>('/api/audit')
      .then(setLogs)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = logs.filter((l) => {
    if (actionFilter !== 'all' && l.action !== actionFilter) return false
    if (search) {
      const s = search.toLowerCase()
      return (
        l.action.toLowerCase().includes(s) ||
        l.resourceId.toLowerCase().includes(s) ||
        l.actor?.name?.toLowerCase().includes(s) ||
        l.actor?.email?.toLowerCase().includes(s)
      )
    }
    return true
  })

  const uniqueActions = [...new Set(logs.map((l) => l.action))]

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold mb-1">Denetim Kayıtları</h2>
          <p className="text-sm text-muted-foreground">Tüm sistem aktiviteleri ve değişiklikler</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" disabled aria-label="Denetim kayıtlarını dışa aktarma (yakında)" title="Denetim kayıtlarını dışa aktarma (yakında)">
          <Download className="w-3.5 h-3.5" /> Export (yakında)
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Loglarda ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-full sm:w-56 gap-2">
            <Filter className="w-3.5 h-3.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm İşlemler</SelectItem>
            {uniqueActions.map((a) => (
              <SelectItem key={a} value={a}>
                {actionConfig[a]?.label || a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden">
        <div className="divide-y divide-border">
          {loading ? (
            [...Array(8)].map((_, i) => (
              <div key={i} className="p-4">
                <div className="shimmer h-12 w-full rounded" />
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Shield className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Kayıt bulunamadı</p>
            </div>
          ) : (
            filtered.map((log) => {
              const cfg = actionConfig[log.action] || { label: log.action, icon: Circle, color: 'bg-muted text-muted-foreground' }
              const Icon = cfg.icon
              const initials = (log.actor?.name || log.actor?.email || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
              return (
                <div key={log.id} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', cfg.color)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{cfg.label}</span>
                        <Badge variant="outline" className="text-[10px]">{log.resourceType}</Badge>
                        {log.after?.status && (
                          <Badge variant="outline" className="text-[10px] capitalize">{log.after.status}</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                        <div>
                          Kaynak ID: <code className="bg-muted px-1 rounded">{log.resourceId.slice(0, 12)}</code>
                        </div>
                        {log.after?.title && (
                          <div>Başlık: <span className="text-foreground">{log.after.title}</span></div>
                        )}
                        {log.before?.status && log.after?.status && (
                          <div>
                            Durum: <span className="text-foreground">{log.before.status}</span> → <span className="text-foreground">{log.after.status}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right hidden sm:block">
                        <div className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                      {log.actor && (
                        <Avatar className="w-7 h-7">
                          <AvatarFallback className="bg-gradient-to-br from-primary to-chart-3 text-primary-foreground text-[10px] font-semibold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </Card>
    </div>
  )
}
