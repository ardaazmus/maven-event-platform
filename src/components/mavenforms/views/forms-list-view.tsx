'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api-client'
import type { FormListItem, Folder, Tag } from '@/lib/types'
import { useApp } from '@/lib/store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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
} from 'lucide-react'
import { cn } from '@/lib/utils'

const statusConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  draft: { label: 'Taslak', color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-500/10', dot: 'bg-gray-400' },
  published: { label: 'Yayında', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', dot: 'bg-emerald-500' },
  paused: { label: 'Durduruldu', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', dot: 'bg-amber-500' },
  archived: { label: 'Arşiv', color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-500/10', dot: 'bg-gray-300' },
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
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [newFormOpen, setNewFormOpen] = useState(false)
  const [newForm, setNewForm] = useState({ title: '', description: '', slug: '', folderId: '' })
  const [creating, setCreating] = useState(false)
  const { selectForm, setView, setFolders: setStoreFolders, setTags: setStoreTags } = useApp()
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

  const handleCreate = async () => {
    if (!newForm.title.trim()) {
      toast({ title: 'Form adı gerekli', variant: 'destructive' })
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
        }),
      })
      toast({ title: 'Form oluşturuldu', description: 'Builder açılıyor...' })
      setNewFormOpen(false)
      setNewForm({ title: '', description: '', slug: '', folderId: '' })
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
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Folder sidebar */}
      <div className="hidden lg:flex w-60 shrink-0 border-r border-border bg-muted/20 flex-col">
        <div className="p-4 border-b border-border">
          <Button className="w-full gap-2" onClick={() => setNewFormOpen(true)}>
            <Plus className="w-4 h-4" />
            Yeni Form
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          <button
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
                  className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-medium border cursor-pointer hover:scale-105 transition-transform"
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
            {[
              { name: 'Bugün yanıt alanlar', icon: Clock, color: 'text-blue-500' },
              { name: 'Ücretli formlar', icon: TrendingUp, color: 'text-emerald-500' },
              { name: 'Çok aktif', icon: TrendingUp, color: 'text-amber-500' },
            ].map((sf, i) => (
              <button
                key={i}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <sf.icon className={cn('w-3.5 h-3.5', sf.color)} />
                {sf.name}
              </button>
            ))}
          </div>
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
            <div className="flex gap-1 p-0.5 bg-muted rounded-lg border border-border">
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
            <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs">
              <ArrowUpDown className="w-3 h-3" />
              Sırala
            </Button>
          </div>
        </div>

        {/* Forms */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
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
              {forms.map((form) => (
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
                  {forms.map((form) => {
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
  return (
    <Card className="p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group relative" onClick={onOpen}>
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

      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-3 text-xs">
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
        <span className="text-[10px] text-muted-foreground">
          {new Date(form.updatedAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
        </span>
      </div>

      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
        <FormActionMenu form={form} onAction={onAction} />
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
