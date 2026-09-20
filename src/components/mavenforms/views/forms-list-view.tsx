'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api-client'
import type { FormListItem, Folder, Tag, Submission } from '@/lib/types'
import { useApp } from '@/lib/store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  FileText,
  Plus,
  LayoutGrid,
  List,
  Search,
  MoreVertical,
  Eye,
  Edit3,
  Copy,
  Code2,
  Settings,
  Trash2,
  Archive,
  Play,
  Pause,
  Inbox,
  Tag as TagIcon,
  Folder as FolderIcon,
  ChevronDown,
  Sparkles,
  FileJson,
  Clock,
  TrendingUp,
  Filter,
  Download,
  ArrowUpDown,
  Palette,
  GitBranch,
  Bell,
  CreditCard,
  Plug,
  BarChart3,
  BadgeCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { InvoiceCenterView } from '@/components/mavenforms/views/invoice-center-view'

const statusConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  draft: { label: 'Taslak', color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-500/10', dot: 'bg-gray-400' },
  published: { label: 'Yayında', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', dot: 'bg-emerald-500' },
  paused: { label: 'Durduruldu', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', dot: 'bg-amber-500' },
  archived: { label: 'Arşiv', color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-500/10', dot: 'bg-gray-300' },
}

const responseStatusConfig: Record<string, { label: string; color: string; bg: string }> = {
  new: { label: 'Yeni', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
  reviewing: { label: 'İnceleniyor', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
  approved: { label: 'Onaylandı', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
  rejected: { label: 'Reddedildi', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10' },
  spam: { label: 'Spam', color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-500/10' },
  archived: { label: 'Arşiv', color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-500/10' },
}

const formSettingsGroups = [
  {
    id: 'configuration',
    label: 'Yapılandırma',
    items: [
      { id: 'settings', label: 'Genel ayarlar', icon: Settings },
      { id: 'logic', label: 'Mantık', icon: GitBranch },
      { id: 'notifications', label: 'Bildirimler', icon: Bell },
    ],
  },
  {
    id: 'design',
    label: 'Tasarım',
    items: [
      { id: 'appearance', label: 'Görünüm ve tema', icon: Palette },
    ],
  },
  {
    id: 'delivery',
    label: 'Paylaşım ve bağlantılar',
    items: [
      { id: 'embed', label: 'WordPress / Embed', icon: Code2 },
      { id: 'payment', label: 'Ödeme', icon: CreditCard },
      { id: 'integrations', label: 'Entegrasyonlar', icon: Plug },
    ],
  },
    {
      id: 'insights',
      label: 'Sonuçlar',
      items: [
        { id: 'reports', label: 'Raporlar', icon: BarChart3 },
        { id: 'submissions', label: 'Yanıtlar', icon: Inbox },
        { id: 'badge', label: 'Yaka kartı', icon: BadgeCheck },
      ],
  },
] as const

type FocusedFormSummary = Pick<FormListItem, 'id' | 'title' | 'slug' | 'status' | 'submissionCount'> & {
  fieldCount: number
}

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ı/g, 'i')
    .replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
}

export function FormsListView() {
  const [forms, setForms] = useState<FormListItem[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setViewMode] = useState<'grid' | 'table'>('grid')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'title' | 'responses'>('updated')
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [smartFilter, setSmartFilter] = useState<'today' | 'active' | null>(null)
  const [newFormOpen, setNewFormOpen] = useState(false)
  const [newForm, setNewForm] = useState({ title: '', description: '', slug: '', folderId: '', enableUserConfirmation: false })
  const [creating, setCreating] = useState(false)
  const [formMode, setFormMode] = useState<'general' | 'event'>('general')
  const [eventOptions, setEventOptions] = useState<Array<{ id: string; title: string }>>([])
  const [eventId, setEventId] = useState('')
  const [eventsLoading, setEventsLoading] = useState(false)
  const { selectedFormId, selectForm, setView, setFolders: setStoreFolders, setTags: setStoreTags } = useApp()
  const [focusedSummary, setFocusedSummary] = useState<FocusedFormSummary | null>(null)
  const [focusedSubmissions, setFocusedSubmissions] = useState<Submission[]>([])
  const [focusedLoading, setFocusedLoading] = useState(false)
  const { toast } = useToast()

  const loadForms = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (selectedFolder) params.set('folderId', selectedFolder)
      if (search) params.set('search', search)
      const data = await api<FormListItem[]>(`/api/forms?${params.toString()}`)
      setForms(data)
    } catch (err: any) {
      toast({ title: 'Formlar yüklenemedi', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const loadMeta = async () => {
    try {
      const [foldersData, tagsData] = await Promise.all([api<Folder[]>('/api/folders'), api<Tag[]>('/api/tags')])
      setFolders(foldersData)
      setTags(tagsData)
      setStoreFolders(foldersData)
      setStoreTags(tagsData)
    } catch {}
  }

  useEffect(() => {
    loadMeta()
  }, [])

  useEffect(() => {
    const t = setTimeout(loadForms, 250)
    return () => clearTimeout(t)
  }, [search, statusFilter, selectedFolder])

  const displayForms = forms.filter((form) => {
    if (smartFilter === 'today') return form.todaySubmissionCount > 0
    if (smartFilter === 'active') return form.submissionCount >= 10
    return true
  }).sort((a, b) => {
    if (sortBy === 'title') return a.title.localeCompare(b.title, 'tr', { sensitivity: 'base' })
    if (sortBy === 'responses') return b.submissionCount - a.submissionCount || b.updatedAt.localeCompare(a.updatedAt)
    const field = sortBy === 'created' ? 'createdAt' : 'updatedAt'
    return b[field].localeCompare(a[field])
  })

  const focusedForm = forms.find((form) => form.id === selectedFormId)
    || forms.find((form) => form.status === 'published')
    || forms[0]
    || null

  useEffect(() => {
    if (!focusedForm) {
      setFocusedSummary(null)
      setFocusedSubmissions([])
      return
    }
    let active = true
    setFocusedLoading(true)
    Promise.all([
      api<FocusedFormSummary>(`/api/forms/${focusedForm.id}/summary`),
      api<Submission[]>(`/api/forms/${focusedForm.id}/submissions?page=1&pageSize=4`),
    ])
      .then(([summary, submissions]) => {
        if (!active) return
        setFocusedSummary(summary)
        setFocusedSubmissions(Array.isArray(submissions) ? submissions : [])
      })
      .catch(() => {
        if (!active) return
        setFocusedSummary(null)
        setFocusedSubmissions([])
      })
      .finally(() => {
        if (active) setFocusedLoading(false)
      })
    return () => { active = false }
  }, [focusedForm?.id])

  // Listen for new form events
  useEffect(() => {
    const handler = () => setNewFormOpen(true)
    window.addEventListener('mavenforms:new-form', handler)
    const searchHandler = (e: Event) => setSearch((e as CustomEvent).detail)
    window.addEventListener('mavenforms:search', searchHandler)
    return () => {
      window.removeEventListener('mavenforms:new-form', handler)
      window.removeEventListener('mavenforms:search', searchHandler)
    }
  }, [])

  // Event picker options for "Etkinlik Kaydı Formu" mode
  useEffect(() => {
    if (!newFormOpen) return
    let active = true
    setEventsLoading(true)
    api<Array<{ id: string; title: string }>>('/api/events')
      .then((rows) => {
        if (active) setEventOptions(Array.isArray(rows) ? rows : [])
      })
      .catch(() => {
        if (active) setEventOptions([])
      })
      .finally(() => {
        if (active) setEventsLoading(false)
      })
    return () => { active = false }
  }, [newFormOpen])

  const handleCreate = async () => {
    if (!newForm.title.trim()) {
      toast({ title: 'Form adı gerekli', variant: 'destructive' })
      return
    }
    if (formMode === 'event' && !eventId) {
      toast({ title: 'Etkinlik seçin', description: 'Etkinlik Kaydı Formu bir etkinliğe bağlanmalıdır.', variant: 'destructive' })
      return
    }
    const slug = newForm.slug || slugify(newForm.title)
    setCreating(true)
    try {
      const created = await api<FormListItem>('/api/forms', {
        method: 'POST',
        body: JSON.stringify({
          title: newForm.title,
          description: newForm.description || null,
          slug,
          folderId: newForm.folderId || null,
          enableUserConfirmation: newForm.enableUserConfirmation,
        }),
      })
      if (formMode === 'event') {
        try {
          await api(`/api/events/${encodeURIComponent(eventId)}/bindings`, {
            method: 'POST',
            body: JSON.stringify({ formId: created.id, purpose: 'registration' }),
          })
        } catch (bindErr: any) {
          toast({ title: 'Form oluşturuldu ancak etkinlik bağlantısı kurulamadı', description: bindErr.message, variant: 'destructive' })
        }
      }
      toast({ title: 'Form oluşturuldu', description: 'Builder açılıyor...' })
      setNewFormOpen(false)
      setNewForm({ title: '', description: '', slug: '', folderId: '', enableUserConfirmation: false })
      setFormMode('general')
      setEventId('')
      selectForm(created.id, 'fields')
      setView('builder')
    } catch (err: any) {
      toast({ title: 'Form oluşturulamadı', description: err.message, variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  const handleAction = async (form: FormListItem, action: string) => {
    try {
      if (action === 'edit') {
        selectForm(form.id, 'fields')
        setView('builder')
      } else if (action.startsWith('settings:')) {
        selectForm(form.id, action.slice('settings:'.length))
        setView('builder')
      } else if (action === 'settings') {
        selectForm(form.id, 'settings')
        setView('builder')
      } else if (action === 'submissions') {
        selectForm(form.id, 'submissions')
        setView('submissions')
      } else if (action === 'preview') {
        selectForm(form.id, 'preview')
        setView('builder')
      } else if (action === 'duplicate') {
        const dup = await api(`/api/forms/${form.id}?action=duplicate`, { method: 'POST' })
        toast({ title: 'Form çoğaltıldı', description: `${dup.title} oluşturuldu` })
        loadForms()
      } else if (action === 'publish') {
        await api(`/api/forms/${form.id}/publish`, { method: 'POST' })
        toast({ title: 'Form yayınlandı', description: form.title })
        loadForms()
      } else if (action === 'pause') {
        await api(`/api/forms/${form.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'paused' }),
        })
        toast({ title: 'Form durduruldu' })
        loadForms()
      } else if (action === 'resume') {
        await api(`/api/forms/${form.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'published' }),
        })
        toast({ title: 'Form yayınlandı' })
        loadForms()
      } else if (action === 'archive') {
        await api(`/api/forms/${form.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'archived' }),
        })
        toast({ title: 'Form arşivlendi' })
        loadForms()
      } else if (action === 'delete') {
        if (confirm(`${form.title} silinsin mi? (Soft-delete)`)) {
          await api(`/api/forms/${form.id}`, { method: 'DELETE' })
          toast({ title: 'Form silindi' })
          loadForms()
        }
      } else if (action === 'embed') {
        selectForm(form.id, 'embed')
        setView('builder')
      }
    } catch (err: any) {
      toast({ title: 'İşlem başarısız', description: err.message, variant: 'destructive' })
    }
  }

  return (
    <div className="flex min-w-0 h-[calc(100vh-4rem)]">
      {/* Folder sidebar */}
      <div className="hidden lg:flex w-60 shrink-0 border-r border-border bg-muted/20 flex-col">
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          <button
            type="button"
            aria-current={!selectedFolder ? 'page' : undefined}
            onClick={() => setSelectedFolder(null)}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
              !selectedFolder ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-muted-foreground hover:text-foreground'
            )}
          >
            <Inbox className="w-4 h-4" />
            Tüm Formlar
            <span className="ml-auto text-xs">{forms.length}</span>
          </button>
          {folders.map((folder) => (
            <button
              key={folder.id}
              type="button"
              aria-current={selectedFolder === folder.id ? 'page' : undefined}
              onClick={() => setSelectedFolder(folder.id)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                selectedFolder === folder.id ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              <FolderIcon className="w-4 h-4" style={{ color: folder.color }} />
              <span className="flex-1 text-left truncate">{folder.name}</span>
              <span className="text-xs">{folder.formCount}</span>
            </button>
          ))}

          <div className="pt-3 mt-3 border-t border-border">
            <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Etiketler
            </div>
            <div className="flex flex-wrap gap-1.5 px-2">
              {tags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-medium border"
                  style={{
                    backgroundColor: `${tag.color}15`,
                    color: tag.color,
                    borderColor: `${tag.color}30`,
                  }}
                >
                  <TagIcon className="w-2.5 h-2.5" />
                  {tag.name}
                </span>
              ))}
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-border">
            <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Akıllı Klasörler
            </div>
            <button
              type="button"
              aria-pressed={smartFilter === 'today'}
              onClick={() => setSmartFilter((current) => current === 'today' ? null : 'today')}
              className={cn('w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors', smartFilter === 'today' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}
            >
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              Bugün yanıt alanlar
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground" aria-disabled="true">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span>Ücretli formlar</span>
              <span className="ml-auto text-[10px]">Kurulum bekliyor</span>
            </div>
            <button
              type="button"
              aria-pressed={smartFilter === 'active'}
              onClick={() => setSmartFilter((current) => current === 'active' ? null : 'active')}
              className={cn('w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors', smartFilter === 'active' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}
            >
              <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
              Çok aktif
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="min-w-0 flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-border space-y-3 bg-background/80 backdrop-blur">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Form ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40 gap-2">
                <Filter className="w-3.5 h-3.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                <SelectItem value="draft">Taslak</SelectItem>
                <SelectItem value="published">Yayında</SelectItem>
                <SelectItem value="paused">Durduruldu</SelectItem>
                <SelectItem value="archived">Arşiv</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              aria-label="Yeni Form oluştur (Forms)"
              onClick={() => setNewFormOpen(true)}
            >
              <Plus className="w-3.5 h-3.5" />
              Yeni Form
            </Button><div className="flex gap-1 p-0.5 bg-muted rounded-lg border border-border">
              <Button
                size="sm"
                variant={view === 'grid' ? 'default' : 'ghost'}
                className="gap-1.5"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Kart</span>
              </Button>
              <Button
                size="sm"
                variant={view === 'table' ? 'default' : 'ghost'}
                className="gap-1.5"
                onClick={() => setViewMode('table')}
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tablo</span>
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{loading ? 'Yükleniyor...' : `${forms.length} form bulundu`}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs" aria-label="Formları sırala">
                  <ArrowUpDown className="w-3 h-3" />
                  Sırala
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Formları sırala</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSortBy('updated')}>Güncelleme tarihi {sortBy === 'updated' ? '✓' : ''}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('created')}>Oluşturulma tarihi {sortBy === 'created' ? '✓' : ''}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('title')}>Başlık {sortBy === 'title' ? '✓' : ''}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('responses')}>Yanıt sayısı {sortBy === 'responses' ? '✓' : ''}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Forms */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          {focusedForm && (
            <FocusedFormWorkspace
              form={focusedForm}
              summary={focusedSummary}
              submissions={focusedSubmissions}
              loading={focusedLoading}
              onOpenResponses={() => {
                selectForm(focusedForm.id, 'submissions')
                setView('submissions')
              }}
              onSelectSettingsTab={(tab) => {
                if (tab === 'edit') {
                  handleAction(focusedForm, 'edit')
                  return
                }
                if (tab === 'submissions') {
                  selectForm(focusedForm.id, 'submissions')
                  setView('submissions')
                  return
                }
                handleAction(focusedForm, `settings:${tab}`)
              }}
            />
          )}
          {focusedForm && <InvoiceCenterView formId={focusedForm.id} />}
          {loading ? (
            <div className={view === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-2'}>
              {[...Array(6)].map((_, i) => (
                <Card key={i} className={view === 'grid' ? 'p-5 h-44' : 'p-4 h-16'}>
                  <div className="shimmer h-full w-full rounded" />
                </Card>
              ))}
            </div>
          ) : forms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Form bulunamadı</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {search ? 'Arama kriterlerinize uygun form yok.' : 'İlk formunuzu oluşturun.'}
              </p>
              <Button onClick={() => setNewFormOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Yeni Form
              </Button>
            </div>
          ) : view === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayForms.map((form) => (
                <FormCard
                  key={form.id}
                  form={form}
                  onAction={handleAction}
                  onOpen={() => {
                    selectForm(form.id, 'submissions')
                    setView('submissions')
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">Form</th>
                    <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground hidden md:table-cell">Durum</th>
                    <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Klasör</th>
                    <th className="text-right px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">Yanıt</th>
                    <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Güncelleme</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {displayForms.map((form) => {
                    const cfg = statusConfig[form.status] || statusConfig.draft
                    return (
                      <tr
                        key={form.id}
                        className="hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => {
                          selectForm(form.id, 'submissions')
                          setView('submissions')
                        }}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/15 to-chart-3/10 flex items-center justify-center shrink-0">
                              <FileText className="w-4 h-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium truncate">{form.title}</div>
                              <div className="text-xs text-muted-foreground">/{form.slug}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium', cfg.bg, cfg.color)}>
                            <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          {form.folder ? (
                            <span className="inline-flex items-center gap-1.5 text-xs">
                              <FolderIcon className="w-3 h-3" style={{ color: form.folder.color }} />
                              {form.folder.name}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="font-medium">{form.submissionCount}</div>
                          {form.todaySubmissionCount > 0 && (
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
                              +{form.todaySubmissionCount} bugün
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                          {new Date(form.updatedAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>
                          <FormActionMenu form={form} onAction={handleAction} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* New Form Dialog */}
      <Dialog open={newFormOpen} onOpenChange={setNewFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Yeni Form Oluştur
            </DialogTitle>
            <DialogDescription>
              Form türünü ve temel bilgileri seçerek yeni bir çalışma alanı oluşturun.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-2">
              {[
                { type: 'blank', label: 'Boş Form', icon: FileText, desc: 'Sıfırdan başla' },
                { type: 'template', label: 'Şablon', icon: Sparkles, desc: 'Hazır formlar' },
                { type: 'import', label: 'İçe Aktar', icon: FileJson, desc: 'JSON ile' },
              ].map((opt, i) => (
                <button
                  key={i}
                  className={cn(
                    'rounded-lg border p-3 text-left hover:border-primary transition-colors',
                    i === 0 ? 'border-primary bg-primary/5' : 'border-border'
                  )}
                >
                  <opt.icon className="w-4 h-4 text-primary mb-1.5" />
                  <div className="text-xs font-medium">{opt.label}</div>
                  <div className="text-[10px] text-muted-foreground">{opt.desc}</div>
                </button>
              ))}
            </div>

            <div className="space-y-2">
            </div>
            <div className="space-y-2">
              <Label>Form Modu *</Label>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Form modu">
                <button
                  type="button"
                  role="radio"
                  aria-checked={formMode === 'general'}
                  onClick={() => setFormMode('general')}
                  className={cn(
                    'rounded-lg border p-3 text-left transition-colors',
                    formMode === 'general' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary'
                  )}
                >
                  <div className="text-xs font-medium">Genel Form</div>
                  <div className="text-[10px] text-muted-foreground">Etkinliksiz bağımsız veri toplama</div>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={formMode === 'event'}
                  onClick={() => setFormMode('event')}
                  className={cn(
                    'rounded-lg border p-3 text-left transition-colors',
                    formMode === 'event' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary'
                  )}
                >
                  <div className="text-xs font-medium">Etkinlik Kaydı Formu</div>
                  <div className="text-[10px] text-muted-foreground">Seçili etkinliğe kayıt üretir</div>
                </button>
              </div>
            </div>
            {formMode === 'event' ? (
              <div className="space-y-2">
                <Label>Etkinlik *</Label>
                <Select value={eventId} onValueChange={setEventId}>
                  <SelectTrigger aria-label="Etkinlik seç">
                    <SelectValue placeholder={eventsLoading ? 'Etkinlikler yükleniyor...' : 'Kayıt toplanacak etkinliği seçin'} />
                  </SelectTrigger>
                  <SelectContent>
                    {eventOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Etkinlik Kaydı Formu, etkinlik seçilmeden yayınlanamaz; yanıtlar kayıt havuzuna düşer.</p>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="form-title">Form Adı *</Label>
              <Input
                id="form-title"
                placeholder="örn. Etkinlik Kayıt Formu"
                value={newForm.title}
                onChange={(e) => {
                  const title = e.target.value
                  setNewForm({
                    ...newForm,
                    title,
                    slug: slugify(title),
                  })
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="form-desc">Açıklama</Label>
              <Textarea
                id="form-desc"
                placeholder="Formun amacını kısaca açıklayın..."
                value={newForm.description}
                onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="form-slug">URL Slug</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">/forms/</span>
                <Input
                  id="form-slug"
                  placeholder="form-slug"
                  value={newForm.slug}
                  onChange={(e) => setNewForm({ ...newForm, slug: slugify(e.target.value) })}
                  className="font-mono text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Klasör (opsiyonel)</Label>
              <Select
                value={newForm.folderId}
                onValueChange={(v) => setNewForm({ ...newForm, folderId: v === 'none' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Klasör seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Klasörsüz</SelectItem>
                  {folders.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      <span className="flex items-center gap-2">
                        <FolderIcon className="w-3 h-3" style={{ color: f.color }} />
                        {f.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-border/70 p-3">
              <Checkbox
                id="form-user-confirmation"
                checked={newForm.enableUserConfirmation}
                onCheckedChange={(checked) => setNewForm({ ...newForm, enableUserConfirmation: checked === true })}
              />
              <div className="space-y-1">
                <Label htmlFor="form-user-confirmation" className="cursor-pointer">Katılımcıya yanıt alındı e-postası gönder</Label>
                <p className="text-xs text-muted-foreground">Form başlangıçta public zorunlu e-posta alanı ve kullanıcı onayı bildirimiyle oluşturulur. Gerçek gönderim mail sağlayıcısı açılınca çalışır.</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFormOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? 'Oluşturuluyor...' : 'Oluştur ve Düzenle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function FocusedFormWorkspace({
  form,
  summary,
  submissions,
  loading,
  onOpenResponses,
  onSelectSettingsTab,
}: {
  form: FormListItem
  summary: FocusedFormSummary | null
  submissions: Submission[]
  loading: boolean
  onOpenResponses: () => void
  onSelectSettingsTab: (tab: string) => void
}) {
  const cfg = statusConfig[form.status] || statusConfig.draft
  const total = summary?.submissionCount ?? form.submissionCount
  const displaySubmission = (submission: Submission) => {
    const name = submission.submitter?.name
      || submission.values.find((value) => ['full_name', 'name', 'ad_soyad'].includes(value.field.fieldKey))?.normalizedText
      || 'Anonim'
    const email = submission.submitter?.email
      || submission.values.find((value) => value.field.type === 'email')?.normalizedText
      || 'E-posta yok'
    return { name, email }
  }

  return (
    <Card className="mb-5 overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.06] via-background to-background">
      <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)] xl:p-5">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-semibold uppercase tracking-wider text-primary">Öne çıkan form</span>
            <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium', cfg.bg, cfg.color)}>
              <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
              {cfg.label}
            </span>
          </div>
          <h2 className="truncate text-lg font-semibold sm:text-xl">{form.title}</h2>
          <p className="mt-1 truncate text-xs text-muted-foreground">/forms/{form.slug}</p>

          <div className="mt-4 grid max-w-xl grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-lg border border-border/70 bg-background/80 p-2.5">
              <div className="text-lg font-semibold leading-none">{total}</div>
              <div className="mt-1 text-[10px] text-muted-foreground">Toplam yanıt</div>
            </div>
            <div className="rounded-lg border border-border/70 bg-background/80 p-2.5">
              <div className="text-lg font-semibold leading-none">{form.todaySubmissionCount}</div>
              <div className="mt-1 text-[10px] text-muted-foreground">Bugünkü yanıt</div>
            </div>
            <div className="rounded-lg border border-border/70 bg-background/80 p-2.5">
              <div className="text-lg font-semibold leading-none">{summary?.fieldCount ?? '—'}</div>
              <div className="mt-1 text-[10px] text-muted-foreground">Form alanı</div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={onOpenResponses} className="gap-2">
              <Inbox className="h-3.5 w-3.5" />
              Yanıtları aç
            </Button>
            <FormSettingsMenu form={form} buttonLabel="Formu yönet" onSelect={onSelectSettingsTab} />
          </div>

          {form.status === 'published' && (
            <div className="mt-4 overflow-hidden rounded-xl border border-border/70 bg-background/80 shadow-sm">
              <div className="border-b border-border/70 px-3 py-2">
                <h3 className="text-xs font-semibold">Canlı form</h3>
                <p className="text-[10px] text-muted-foreground">Katılımcının göreceği yayınlanmış görünüm</p>
              </div>
              <iframe
                title={`${form.title} canlı form`}
                src={`/forms/${encodeURIComponent(form.slug)}?embed=1`}
                className="block h-[min(420px,55vh)] min-h-[260px] w-full border-0"
                loading="lazy"
                sandbox="allow-forms allow-scripts allow-same-origin allow-popups"
              />
            </div>
          )}
        </div>

        <div className="min-w-0 rounded-xl border border-border/70 bg-background/80 p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">Son yanıtlar</h3>
              <p className="text-[11px] text-muted-foreground">Seçili formun en son kayıtları</p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={onOpenResponses} className="h-7 shrink-0 px-2 text-xs">
              Tümü
            </Button>
          </div>
          {loading ? (
            <div className="space-y-2" aria-label="Son yanıtlar yükleniyor">
              {[1, 2, 3].map((item) => <div key={item} className="h-9 animate-pulse rounded-md bg-muted" />)}
            </div>
          ) : submissions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              Henüz yanıt yok.
            </div>
          ) : (
            <div className="space-y-1">
              {submissions.slice(0, 4).map((submission) => {
                const person = displaySubmission(submission)
                const submissionCfg = responseStatusConfig[submission.status] || responseStatusConfig.new
                return (
                  <button
                    type="button"
                    key={submission.id}
                    onClick={onOpenResponses}
                    className="flex w-full min-w-0 items-center gap-2 rounded-lg p-2 text-left hover:bg-muted/70"
                  >
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarFallback className="text-[10px]">{person.name.slice(0, 1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium">{person.name}</span>
                      <span className="block truncate text-[10px] text-muted-foreground">{person.email}</span>
                    </span>
                    <span className={cn('shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium', submissionCfg.bg, submissionCfg.color)}>
                      {submissionCfg.label}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

function FormSettingsMenu({
  form,
  buttonLabel = 'Ayarlar',
  onSelect,
}: {
  form: FormListItem
  buttonLabel?: string
  onSelect: (tab: string) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          aria-label={`${form.title} ayarlarını aç`}
          className="h-8 gap-1.5 px-2.5 text-xs"
          onClick={(event) => event.stopPropagation()}
        >
          <Settings className="h-3.5 w-3.5" />
          <span>{buttonLabel}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-[min(70vh,32rem)] w-72 overflow-y-auto" onClick={(event) => event.stopPropagation()}>
        <DropdownMenuLabel>{form.title} · Form ayarları ve yönetim</DropdownMenuLabel>
        <DropdownMenuItem className="gap-2 text-sm" onClick={() => onSelect('edit')}>
          <Edit3 className="h-4 w-4" />
          Formu düzenle
        </DropdownMenuItem>
        {formSettingsGroups.map((group) => (
          <div key={group.id}>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              {group.label}
            </DropdownMenuLabel>
            {group.items.map(({ id, label, icon: Icon }) => (
              <DropdownMenuItem key={id} className="gap-2 text-sm" onClick={() => onSelect(id)}>
                <Icon className="h-4 w-4" />
                {label}
              </DropdownMenuItem>
            ))}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function FormCard({
  form,
  onAction,
  onOpen,
}: {
  form: FormListItem
  onAction: (form: FormListItem, action: string) => void
  onOpen: () => void
}) {
  const cfg = statusConfig[form.status] || statusConfig.draft
  const coverMediaId = (form as any).coverMediaId as string | null
  const coverUrl = (form as any).coverImageUrl as string | null
  const coverAlt = (form as any).coverImageAlt || form.title
  // M05.2: prefer coverMediaId (private media) over raw coverImageUrl, fallback deterministic
  const coverSrc = coverMediaId ? `/api/media/${coverMediaId}?formId=${form.id}` : coverUrl
  return (
    <Card className="p-0 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group relative" onClick={onOpen}>
      <div className="form-card__media" style={{ aspectRatio: '16 / 9', overflow: 'hidden', background: '#f1f5f9' }}>
        {coverSrc ? (
          <img src={coverSrc} alt={coverAlt} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={(e) => ((e.currentTarget.style.display='none'))} />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-chart-3/10">
            <FileText className="w-8 h-8 text-primary/40" />
          </div>
        )}
      </div>
      <div className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-chart-3/10 flex items-center justify-center">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium', cfg.bg, cfg.color)}>
          <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
          {cfg.label}
        </span>
      </div>

      <h3 className="font-semibold mb-1 line-clamp-2 min-h-[2.5rem]">{form.title}</h3>
      <p className="text-xs text-muted-foreground mb-3 line-clamp-2 min-h-[2rem]">
        {form.description || `/${form.slug}`}
      </p>

      <div className="flex flex-wrap gap-1 mb-3 min-h-[1.5rem]">
        {form.tags.map((tag) => (
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
        {form.folder && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium border inline-flex items-center gap-1" style={{ color: form.folder.color, borderColor: `${form.folder.color}30`, backgroundColor: `${form.folder.color}10` }}>
            <FolderIcon className="w-2.5 h-2.5" />
            {form.folder.name}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2 pt-3 border-t border-border">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Inbox className="w-3 h-3" />
            <span className="font-medium text-foreground">{form.submissionCount}</span>
            yanıt
          </span>
          {form.todaySubmissionCount > 0 && (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-3 h-3" />
              +{form.todaySubmissionCount}
            </span>
          )}
        </div>
        <div className="flex min-w-0 items-center justify-between gap-2">
          <span className="text-[10px] text-muted-foreground">
            {new Date(form.updatedAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
          </span>
          <FormSettingsMenu
            form={form}
            onSelect={(tab) => onAction(form, tab === 'edit' ? 'edit' : tab === 'submissions' ? 'submissions' : `settings:${tab}`)}
          />
        </div>
      </div>
      </div>
    </Card>
  )
}

function FormActionMenu({
  form,
  onAction,
}: {
  form: FormListItem
  onAction: (form: FormListItem, action: string) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem className="gap-2 text-sm" onClick={() => onAction(form, 'submissions')}>
          <Inbox className="w-4 h-4" /> Yanıtlar
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 text-sm" onClick={() => onAction(form, 'edit')}>
          <Edit3 className="w-4 h-4" /> Düzenle
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 text-sm" onClick={() => onAction(form, 'preview')}>
          <Eye className="w-4 h-4" /> Önizle
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 text-sm" onClick={() => onAction(form, 'embed')}>
          <Code2 className="w-4 h-4" /> Embed Kodu
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {form.status === 'published' ? (
          <DropdownMenuItem className="gap-2 text-sm" onClick={() => onAction(form, 'pause')}>
            <Pause className="w-4 h-4" /> Durdur
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem className="gap-2 text-sm" onClick={() => onAction(form, 'publish')}>
            <Play className="w-4 h-4" /> Yayınla
          </DropdownMenuItem>
        )}
        <DropdownMenuItem className="gap-2 text-sm" onClick={() => onAction(form, 'duplicate')}>
          <Copy className="w-4 h-4" /> Çoğalt
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 text-sm" onClick={() => onAction(form, 'archive')}>
          <Archive className="w-4 h-4" /> Arşivle
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-2 text-sm text-destructive" onClick={() => onAction(form, 'delete')}>
          <Trash2 className="w-4 h-4" /> Sil
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
