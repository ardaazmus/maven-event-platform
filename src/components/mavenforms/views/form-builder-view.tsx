'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api-client'
import type { FormDetail, FormField, FieldType } from '@/lib/types'
import { useApp } from '@/lib/store'
import { FieldPalette } from '@/components/mavenforms/builder/field-palette'
import { BuilderCanvas } from '@/components/mavenforms/builder/canvas'
import { PropertiesPanel } from '@/components/mavenforms/builder/properties-panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import {
  ArrowLeft,
  Save,
  Eye,
  Send,
  Monitor,
  Tablet,
  Smartphone,
  Undo2,
  Redo2,
  Settings,
  Palette,
  Bell,
  GitBranch,
  CreditCard,
  Plug,
  Code2,
  BarChart3,
  FileText,
  Inbox,
  Plus,
  Loader2,
  Settings2,
  CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'

const fieldLabels: Record<FieldType, string> = {
  text: 'Metin', paragraph: 'Paragraf', email: 'E-posta', phone: 'Telefon',
  number: 'Sayı', date: 'Tarih', time: 'Saat', checkbox: 'Onay Kutusu',
  radio: 'Seçim', select: 'Liste', dropdown: 'Liste', file: 'Dosya',
  address: 'Adres', signature: 'İmza', rating: 'Puan', price: 'Fiyat',
  matrix: 'Matris', section: 'Bölüm', page_break: 'Sayfa', media: 'Medya',
  hidden: 'Gizli', captcha: 'Captcha',
}

const tabs = [
  { id: 'fields', label: 'Alanlar', icon: FileText },
  { id: 'settings', label: 'Ayarlar', icon: Settings },
  { id: 'theme', label: 'Tema', icon: Palette },
  { id: 'submissions', label: 'Yanıtlar', icon: Inbox },
  { id: 'logic', label: 'Mantık', icon: GitBranch },
  { id: 'notifications', label: 'Bildirim', icon: Bell },
  { id: 'embed', label: 'Kod', icon: Code2 },
  { id: 'payment', label: 'Ödeme', icon: CreditCard },
  { id: 'integrations', label: 'Entegrasyon', icon: Plug },
  { id: 'reports', label: 'Rapor', icon: BarChart3 },
]

export function FormBuilderView() {
  const { selectedFormId, formDetailTab, selectForm, setView } = useApp()
  const [form, setForm] = useState<FormDetail | null>(null)
  const [fields, setFields] = useState<FormField[]>([])
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [activeTab, setActiveTab] = useState('fields')
  const { toast } = useToast()

  useEffect(() => {
    if (!selectedFormId) {
      setView('forms')
      return
    }
    loadForm()
    setActiveTab(formDetailTab || 'fields')
  }, [selectedFormId])

  const loadForm = async () => {
    setLoading(true)
    try {
      const data = await api<FormDetail>(`/api/forms/${selectedFormId}`)
      setForm(data)
      setFields(data.fields)
      if (data.fields.length > 0 && !selectedFieldId) {
        setSelectedFieldId(data.fields[0].id)
      }
    } catch (err: any) {
      toast({ title: 'Form yüklenemedi', description: err.message, variant: 'destructive' })
      setView('forms')
    } finally {
      setLoading(false)
    }
  }

  const addField = async (type: FieldType) => {
    if (!form) return
    const fieldKey = `${type}_${Date.now().toString(36).slice(-6)}`
    try {
      const created = await api<FormField>(`/api/forms/${form.id}/fields`, {
        method: 'POST',
        body: JSON.stringify({
          fieldKey,
          type,
          label: fieldLabels[type] || 'Yeni Alan',
          required: ['email', 'phone'].includes(type),
          config: type === 'rating' ? { max: 10, style: 'star' } : type === 'select' || type === 'radio' || type === 'checkbox' ? { options: [{ label: 'Seçenek 1', value: 'opt_1' }] } : {},
        }),
      })
      setFields([...fields, created])
      setSelectedFieldId(created.id)
      toast({ title: 'Alan eklendi', description: fieldLabels[type] })
    } catch (err: any) {
      toast({ title: 'Alan eklenemedi', description: err.message, variant: 'destructive' })
    }
  }

  const updateField = async (id: string, updates: Partial<FormField>) => {
    // Optimistic update
    setFields(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)))
    
    // Debounced save
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(async () => {
      try {
        await api(`/api/forms/${form?.id}/fields/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(updates),
        })
      } catch (err: any) {
        toast({ title: 'Kaydetme hatası', description: err.message, variant: 'destructive' })
      }
    }, 600) as any
  }

  let saveTimer: any = null

  const reorderField = async (id: string, direction: 'up' | 'down') => {
    const idx = fields.findIndex((f) => f.id === id)
    if (idx < 0) return
    const newIdx = direction === 'up' ? idx - 1 : idx + 1
    if (newIdx < 0 || newIdx >= fields.length) return
    const newFields = [...fields]
    ;[newFields[idx], newFields[newIdx]] = [newFields[newIdx], newFields[idx]]
    // Reassign sortOrder
    newFields.forEach((f, i) => (f.sortOrder = i + 1))
    setFields(newFields)
    try {
      await api(`/api/forms/${form?.id}/fields`, {
        method: 'PATCH',
        body: JSON.stringify({
          updates: newFields.map((f, i) => ({ id: f.id, sortOrder: i + 1 })),
        }),
      })
    } catch {}
  }

  const deleteField = async (id: string) => {
    if (!confirm('Bu alan silinsin mi?')) return
    try {
      await api(`/api/forms/${form?.id}/fields/${id}`, { method: 'DELETE' })
      const newFields = fields.filter((f) => f.id !== id)
      setFields(newFields)
      if (selectedFieldId === id) setSelectedFieldId(null)
      toast({ title: 'Alan silindi' })
    } catch (err: any) {
      toast({ title: 'Silme hatası', description: err.message, variant: 'destructive' })
    }
  }

  const duplicateField = async (id: string) => {
    const field = fields.find((f) => f.id === id)
    if (!field || !form) return
    try {
      const created = await api<FormField>(`/api/forms/${form.id}/fields`, {
        method: 'POST',
        body: JSON.stringify({
          fieldKey: `${field.fieldKey}_copy`,
          type: field.type,
          label: `${field.label} (kopya)`,
          required: field.required,
          description: field.description,
          placeholder: field.placeholder,
          config: field.config,
        }),
      })
      // Move to end
      setFields([...fields, created])
      setSelectedFieldId(created.id)
      toast({ title: 'Alan çoğaltıldı' })
    } catch (err: any) {
      toast({ title: 'Çoğaltma hatası', description: err.message, variant: 'destructive' })
    }
  }

  const handleSave = async () => {
    if (!form) return
    setSaving(true)
    try {
      await api(`/api/forms/${form.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          settingsJson: JSON.stringify(form.settings),
        }),
      })
      toast({ title: 'Form kaydedildi', description: 'Taslak güncellendi' })
    } catch (err: any) {
      toast({ title: 'Kaydetme hatası', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    if (!form) return
    if (fields.length === 0) {
      toast({ title: 'Yayınlanamaz', description: 'En az bir alan gerekli', variant: 'destructive' })
      return
    }
    setPublishing(true)
    try {
      await api(`/api/forms/${form.id}/publish`, { method: 'POST' })
      setForm({ ...form, status: 'published' })
      toast({ title: 'Form yayınlandı', description: 'Public URL aktif' })
    } catch (err: any) {
      toast({ title: 'Yayınlama hatası', description: err.message, variant: 'destructive' })
    } finally {
      setPublishing(false)
    }
  }

  if (loading || !form) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  const statusConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
    draft: { label: 'Taslak', color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-500/10', dot: 'bg-gray-400' },
    published: { label: 'Yayında', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', dot: 'bg-emerald-500' },
    paused: { label: 'Durduruldu', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', dot: 'bg-amber-500' },
    archived: { label: 'Arşiv', color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-500/10', dot: 'bg-gray-300' },
  }
  const status = statusConfig[form.status] || statusConfig.draft

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Top toolbar */}
      <div className="flex items-center gap-3 p-3 border-b border-border bg-background/80 backdrop-blur">
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setView('forms')}>
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Formlar</span>
        </Button>

        <Separator orientation="vertical" className="h-6" />

        <div className="flex-1 min-w-0">
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="h-8 border-0 px-1 text-sm font-medium hover:border-input focus-visible:border-input bg-transparent"
          />
        </div>

        <Badge variant="outline" className={cn('gap-1.5 shrink-0', status.bg, status.color)}>
          <span className={cn('w-1.5 h-1.5 rounded-full', status.dot)} />
          {status.label}
        </Badge>

        <div className="hidden md:flex items-center gap-1 p-0.5 bg-muted rounded-lg border border-border">
          {[
            { id: 'desktop', icon: Monitor },
            { id: 'tablet', icon: Tablet },
            { id: 'mobile', icon: Smartphone },
          ].map((d) => (
            <button
              key={d.id}
              onClick={() => setDevice(d.id as any)}
              className={cn(
                'p-1.5 rounded transition-colors',
                device === d.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <d.icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>

        <div className="hidden sm:flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Geri al">
            <Undo2 className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="İleri al">
            <Redo2 className="w-3.5 h-3.5" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6 hidden sm:block" />

        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setActiveTab('preview')}>
          <Eye className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Önizle</span>
        </Button>

        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">Kaydet</span>
        </Button>

        <Button size="sm" className="gap-1.5" onClick={handlePublish} disabled={publishing}>
          {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">Yayınla</span>
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border bg-muted/30 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap',
              activeTab === t.id
                ? 'bg-background text-foreground shadow-sm border border-border'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
            )}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content based on tab */}
      {activeTab === 'fields' && (
        <div className="flex flex-1 overflow-hidden">
          {/* Field palette */}
          <div className="w-64 shrink-0 border-r border-border bg-card hidden md:block">
            <FieldPalette onAdd={addField} />
          </div>

          {/* Canvas */}
          <BuilderCanvas
            fields={fields}
            selectedId={selectedFieldId}
            onSelect={setSelectedFieldId}
            onReorder={reorderField}
            onDelete={deleteField}
            onDuplicate={duplicateField}
            onAddPlaceholder={() => addField('text')}
            formTitle={form.title}
            formDescription={form.description || ''}
            device={device}
          />

          {/* Properties */}
          <div className="w-80 shrink-0 border-l border-border bg-card hidden lg:block">
            <PropertiesPanel
              field={fields.find((f) => f.id === selectedFieldId) || null}
              onUpdate={updateField}
              onDelete={deleteField}
              onDuplicate={duplicateField}
              onMoveUp={(id) => reorderField(id, 'up')}
              onMoveDown={(id) => reorderField(id, 'down')}
            />
          </div>
        </div>
      )}

      {activeTab === 'settings' && <FormSettingsPanel form={form} onUpdate={(updates) => setForm({ ...form, ...updates })} onSave={handleSave} />}

      {activeTab !== 'fields' && activeTab !== 'settings' && (
        <ComingSoonPanel tab={activeTab} form={form} />
      )}
    </div>
  )
}

function FormSettingsPanel({
  form,
  onUpdate,
  onSave,
}: {
  form: FormDetail
  onUpdate: (updates: Partial<FormDetail>) => void
  onSave: () => void
}) {
  return (
    <ScrollArea className="flex-1">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-1">Form Ayarları</h2>
          <p className="text-sm text-muted-foreground">Genel form davranışını yapılandırın</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Form Adı</Label>
            <Input value={form.title} onChange={(e) => onUpdate({ title: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label>Açıklama</Label>
            <Textarea
              value={form.description || ''}
              onChange={(e) => onUpdate({ description: e.target.value })}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>URL Slug</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">/forms/</span>
              <Input value={form.slug} className="font-mono" readOnly />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Başarı Mesajı</Label>
            <Textarea
              value={form.settings?.successMessage || ''}
              onChange={(e) => onUpdate({ settings: { ...form.settings, successMessage: e.target.value } })}
              rows={2}
              placeholder="Form gönderildikten sonra gösterilecek mesaj"
            />
          </div>

          <div className="space-y-2">
            <Label>Submit Buton Metni</Label>
            <Input
              value={form.settings?.submitButtonText || ''}
              onChange={(e) => onUpdate({ settings: { ...form.settings, submitButtonText: e.target.value } })}
              placeholder="Gönder"
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label>Captcha Koruması</Label>
              <p className="text-xs text-muted-foreground">Spam gönderimleri engelle</p>
            </div>
            <Switch
              checked={form.settings?.captcha || false}
              onCheckedChange={(c) => onUpdate({ settings: { ...form.settings, captcha: c } })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Yanıt Limiti</Label>
              <p className="text-xs text-muted-foreground">Maksimum yanıt sayısı</p>
            </div>
            <Input
              type="number"
              value={form.responseLimit ?? ''}
              onChange={(e) => onUpdate({ responseLimit: e.target.value ? parseInt(e.target.value) : null } as any)}
              placeholder="Sınırsız"
              className="w-32"
            />
          </div>

          <Separator />

          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              Form Bilgileri
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-muted-foreground">Form ID</div>
                <code className="text-foreground">{form.id}</code>
              </div>
              <div>
                <div className="text-muted-foreground">Toplam Yanıt</div>
                <div className="font-medium">{form._count?.submissions || 0}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Oluşturan</div>
                <div className="font-medium">{form.creator?.name}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Sahip</div>
                <div className="font-medium">{form.owner?.name}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Oluşturulma</div>
                <div className="font-medium">{new Date(form.createdAt).toLocaleDateString('tr-TR')}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Güncelleme</div>
                <div className="font-medium">{new Date(form.updatedAt).toLocaleDateString('tr-TR')}</div>
              </div>
            </div>
          </div>

          <Button onClick={onSave} className="w-full gap-2">
            <Save className="w-4 h-4" />
            Ayarları Kaydet
          </Button>
        </div>
      </div>
    </ScrollArea>
  )
}

function ComingSoonPanel({ tab, form }: { tab: string; form: FormDetail }) {
  const tabInfo = tabs.find((t) => t.id === tab)
  const Icon = tabInfo?.icon || Settings2

  return (
    <ScrollArea className="flex-1">
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{tabInfo?.label}</h2>
            <p className="text-sm text-muted-foreground">Bu sekme için panel</p>
          </div>
        </div>

        {tab === 'embed' && <EmbedPanel form={form} />}
        {tab === 'theme' && <ThemePanel form={form} />}
        {tab === 'logic' && <LogicPanel form={form} />}
        {tab === 'notifications' && <NotificationsPanel form={form} />}
        {tab === 'payment' && <PaymentPanel form={form} />}
        {tab === 'integrations' && <IntegrationsPanel form={form} />}
        {tab === 'reports' && <ReportsPanel form={form} />}
        {tab === 'submissions' && <SubmissionsLinkPanel form={form} />}
        {tab === 'preview' && <PreviewPanel form={form} />}
      </div>
    </ScrollArea>
  )
}

function EmbedPanel({ form }: { form: FormDetail }) {
  const embedCode = `<div id="mavenforms-${form.slug}"></div>
<script src="/api/forms/${form.id}/embed.js" async></script>`
  const iframeCode = `<iframe src="/forms/${form.slug}" width="100%" height="600" frameborder="0" title="${form.title}"></iframe>`
  const [copied, setCopied] = useState<string | null>(null)
  const { toast } = useToast()

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    toast({ title: 'Kopyalandı!' })
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Public URL</h3>
              <p className="text-xs text-muted-foreground">Direkt paylaşım linki</p>
            </div>
            <Badge variant={form.status === 'published' ? 'default' : 'secondary'}>
              {form.status === 'published' ? 'Aktif' : 'Pasif'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Input readOnly value={`/forms/${form.slug}`} className="font-mono text-sm" />
            <Button variant="outline" size="sm" onClick={() => copy(`/forms/${form.slug}`, 'url')}>
              {copied === 'url' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Code2 className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        <Label>JavaScript Embed</Label>
        <div className="relative">
          <pre className="rounded-lg bg-muted/50 p-4 text-xs font-mono overflow-x-auto border border-border">
            {embedCode}
          </pre>
          <Button
            variant="outline"
            size="sm"
            className="absolute top-2 right-2"
            onClick={() => copy(embedCode, 'js')}
          >
            {copied === 'js' ? <CheckCircle2 className="w-3.5 h-3.5" /> : 'Kopyala'}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <Label>Iframe Embed</Label>
        <div className="relative">
          <pre className="rounded-lg bg-muted/50 p-4 text-xs font-mono overflow-x-auto border border-border">
            {iframeCode}
          </pre>
          <Button
            variant="outline"
            size="sm"
            className="absolute top-2 right-2"
            onClick={() => copy(iframeCode, 'iframe')}
          >
            {copied === 'iframe' ? <CheckCircle2 className="w-3.5 h-3.5" /> : 'Kopyala'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { type: 'PHP Server-side', desc: 'Aynı sunucu' },
          { type: 'Popup Link', desc: 'Açılır pencere' },
          { type: 'Plain URL', desc: 'Direkt link' },
        ].map((opt, i) => (
          <Card key={i} className="p-4 hover:border-primary transition-colors cursor-pointer">
            <Code2 className="w-5 h-5 text-primary mb-2" />
            <div className="text-sm font-medium">{opt.type}</div>
            <div className="text-xs text-muted-foreground">{opt.desc}</div>
          </Card>
        ))}
      </div>
    </div>
  )
}

function ThemePanel({ form }: { form: FormDetail }) {
  const themes = [
    { name: 'Vibrant', colors: ['#7c3aed', '#ec4899', '#f59e0b'] },
    { name: 'Light', colors: ['#ffffff', '#f3f4f6', '#10b981'] },
    { name: 'Dark', colors: ['#1f2937', '#374151', '#6366f1'] },
    { name: 'Emerald', colors: ['#059669', '#10b981', '#f0fdf4'] },
    { name: 'Sunset', colors: ['#f97316', '#fb923c', '#fef3c7'] },
  ]

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h3 className="font-medium mb-3">Hazır Temalar</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {themes.map((t) => (
            <button
              key={t.name}
              className="rounded-lg border-2 border-border hover:border-primary p-3 transition-colors group"
            >
              <div className="flex gap-1 mb-2">
                {t.colors.map((c, i) => (
                  <div key={i} className="w-6 h-6 rounded-full ring-2 ring-background" style={{ backgroundColor: c }} />
                ))}
              </div>
              <div className="text-xs font-medium">{t.name}</div>
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="font-medium">Renk Tokenları</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { name: 'Primary', value: '#7c3aed' },
            { name: 'Background', value: '#ffffff' },
            { name: 'Text', value: '#0f172a' },
            { name: 'Error', value: '#ef4444' },
            { name: 'Success', value: '#10b981' },
            { name: 'Warning', value: '#f59e0b' },
          ].map((c) => (
            <div key={c.name} className="flex items-center gap-2">
              <input type="color" defaultValue={c.value} className="w-10 h-10 rounded border border-border" />
              <div>
                <div className="text-xs font-medium">{c.name}</div>
                <input defaultValue={c.value} className="text-xs font-mono bg-transparent border-0 p-0 w-24" />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5 space-y-3">
        <h3 className="font-medium">Tipografi</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Font Ailesi</Label>
            <select className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm">
              <option>Inter</option>
              <option>Roboto</option>
              <option>Open Sans</option>
              <option>Poppins</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Köşe Yarıçapı</Label>
            <Input type="number" defaultValue={0.625} step={0.1} min={0} max={2} />
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-medium mb-3">Özel CSS</h3>
        <Textarea
          rows={6}
          placeholder=".mavenforms-form { /* özel stiller */ }"
          className="font-mono text-xs"
        />
      </Card>
    </div>
  )
}

function LogicPanel({ form }: { form: FormDetail }) {
  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-medium">Koşullu Mantık Kuralları</h3>
            <p className="text-xs text-muted-foreground">IF-THEN kuralları ile form davranışını otomatikleştirin</p>
          </div>
          <Button size="sm" className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Kural Ekle
          </Button>
        </div>

        <div className="space-y-3">
          {form.logicRules.map((rule) => (
            <Card key={rule.id} className="p-4 border-border/60">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">{rule.name || `Kural ${rule.priority}`}</span>
                  <Badge variant="outline" className="text-[10px]">Öncelik: {rule.priority}</Badge>
                </div>
                <Switch defaultChecked={rule.enabled} />
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>
                  <span className="font-medium text-foreground">EĞER</span>{' '}
                  {rule.conditions.conditions.map((c, i) => (
                    <span key={i}>
                      {i > 0 && <span className="text-primary mx-1">{rule.conditions.type === 'all' ? 'VE' : 'VEYA'}</span>}
                      <code className="bg-muted px-1 rounded">{c.field}</code> {c.operator}{' '}
                      <code className="bg-muted px-1 rounded">{c.value}</code>
                    </span>
                  ))}
                </div>
                <div>
                  <span className="font-medium text-foreground">O ZAMAN</span>{' '}
                  {rule.actions.map((a, i) => (
                    <span key={i}>
                      {i > 0 && ', '}
                      <code className="bg-muted px-1 rounded">{a.type}</code>{' '}
                      {a.target && <code className="bg-muted px-1 rounded">{a.target}</code>}
                    </span>
                  ))}
                </div>
              </div>
            </Card>
          ))}
          {form.logicRules.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Henüz kural yok</p>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-medium mb-3">Kural Testçisi</h3>
        <div className="rounded-lg bg-muted/30 p-4 space-y-2">
          <p className="text-xs text-muted-foreground">Örnek değerlerle kural sonucunu test edin</p>
          <Button variant="outline" size="sm">Test Başlat</Button>
        </div>
      </Card>
    </div>
  )
}

function NotificationsPanel({ form }: { form: FormDetail }) {
  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-medium">Bildirimler</h3>
            <p className="text-xs text-muted-foreground">E-posta ve webhook bildirimleri</p>
          </div>
          <Button size="sm" className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Bildirim Ekle
          </Button>
        </div>

        <div className="space-y-3">
          {form.notifications.map((n) => (
            <Card key={n.id} className="p-4 border-border/60">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">{n.name}</span>
                  <Badge variant="outline" className="text-[10px]">{n.type}</Badge>
                </div>
                <Switch defaultChecked={n.enabled} />
              </div>
              {n.config.subject && (
                <div className="text-xs text-muted-foreground">
                  Konu: <code className="bg-muted px-1 rounded">{n.config.subject}</code>
                </div>
              )}
            </Card>
          ))}
          {form.notifications.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Henüz bildirim yok</p>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-medium mb-3">Merge Tags</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {['{form_title}', '{submission_id}', '{entry_data}', '{field_key}', '{user_email}', '{date}'].map((tag) => (
            <code key={tag} className="text-xs bg-muted px-2 py-1 rounded font-mono cursor-pointer hover:bg-accent">
              {tag}
            </code>
          ))}
        </div>
      </Card>
    </div>
  )
}

function PaymentPanel({ form }: { form: FormDetail }) {
  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h3 className="font-medium mb-3">Ödeme Sağlayıcıları</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { name: 'Stripe', desc: 'Kredi kartı', status: 'connected' },
            { name: 'PayPal', desc: 'PayPal hesabı', status: 'available' },
            { name: 'Authorize.net', desc: 'Kredi kartı', status: 'available' },
            { name: 'Braintree', desc: 'Çoklu yöntem', status: 'available' },
            { name: 'Iyzico', desc: 'TR ödeme', status: 'available' },
            { name: 'Check/Cash', desc: 'Manuel', status: 'available' },
          ].map((p, i) => (
            <Card key={i} className="p-4 flex items-center justify-between hover:border-primary transition-colors cursor-pointer">
              <div>
                <div className="text-sm font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.desc}</div>
              </div>
              <Badge variant={p.status === 'connected' ? 'default' : 'outline'}>
                {p.status === 'connected' ? 'Bağlı' : 'Bağla'}
              </Badge>
            </Card>
          ))}
        </div>
      </Card>

      <Card className="p-5 space-y-3">
        <h3 className="font-medium">Ödeme Ayarları</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Para Birimi</Label>
            <select className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm">
              <option>TRY (₺)</option>
              <option>USD ($)</option>
              <option>EUR (€)</option>
              <option>GBP (£)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Vergi (%)</Label>
            <Input type="number" defaultValue={18} placeholder="18" />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm">Test Modu</Label>
            <p className="text-xs text-muted-foreground">Sahte ödemeler</p>
          </div>
          <Switch defaultChecked />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm">Apple Pay / Google Pay</Label>
            <p className="text-xs text-muted-foreground">Mobil cüzdan desteği</p>
          </div>
          <Switch />
        </div>
      </Card>
    </div>
  )
}

function IntegrationsPanel({ form }: { form: FormDetail }) {
  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-medium">Entegrasyonlar</h3>
            <p className="text-xs text-muted-foreground">Üçüncü parti servislerle bağlantı</p>
          </div>
          <Button size="sm" variant="outline" className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Katalog
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { name: 'Mailchimp', desc: 'E-posta pazarlama', status: 'connected' },
            { name: 'Slack', desc: 'Takım bildirimi', status: 'disconnected' },
            { name: 'Google Sheets', desc: 'Tabloya aktar', status: 'disconnected' },
            { name: 'Zapier', desc: 'Otomasyon', status: 'disconnected' },
            { name: 'HubSpot', desc: 'CRM', status: 'disconnected' },
            { name: 'Webhook', desc: 'Özel HTTP', status: 'disconnected' },
          ].map((p, i) => (
            <Card key={i} className="p-4 flex items-center justify-between hover:border-primary transition-colors cursor-pointer">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <Plug className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.desc}</div>
                </div>
              </div>
              <Badge variant={p.status === 'connected' ? 'default' : 'outline'}>
                {p.status === 'connected' ? 'Bağlı' : 'Bağla'}
              </Badge>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  )
}

function ReportsPanel({ form }: { form: FormDetail }) {
  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-medium">Form Raporları</h3>
            <p className="text-xs text-muted-foreground">{form.title} için analiz</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => useApp.getState().setView('reports')} className="gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" /> Tam Rapor
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Toplam Yanıt', value: form._count?.submissions || 0 },
            { label: 'Bugün', value: form.todaySubmissionCount },
            { label: 'Dönüşüm', value: '24%' },
            { label: 'Ort. Süre', value: '2.3dk' },
          ].map((s, i) => (
            <Card key={i} className="p-3">
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  )
}

function SubmissionsLinkPanel({ form }: { form: FormDetail }) {
  return (
    <Card className="p-5">
      <div className="text-center py-8">
        <Inbox className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
        <h3 className="font-medium mb-1">Yanıtları Yönet</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Bu form için {form._count?.submissions || 0} yanıt mevcut
        </p>
        <Button onClick={() => useApp.getState().setView('submissions')} className="gap-2">
          <Inbox className="w-4 h-4" />
          Yanıtları Görüntüle
        </Button>
      </div>
    </Card>
  )
}

function PreviewPanel({ form }: { form: FormDetail }) {
  return (
    <div className="max-w-2xl mx-auto">
      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-1">{form.title}</h2>
          {form.description && <p className="text-sm text-muted-foreground">{form.description}</p>}
        </div>
        <div className="space-y-4">
          {form.fields.map((field) => (
            <div key={field.id} className="space-y-1.5">
              <Label className="text-sm">
                {field.label}
                {field.required && <span className="text-destructive ml-0.5">*</span>}
              </Label>
              <Input disabled placeholder={field.placeholder || ''} />
            </div>
          ))}
          <Button disabled className="w-full">
            {form.settings?.submitButtonText || 'Gönder'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
