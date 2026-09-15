'use client'

import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api-client'
import type { FormDetail, FormField, FieldType, LogicRule, Notification, ThemeTokens } from '@/lib/types'
import { normalizeFieldConfig, normalizeFieldLayout } from '@/lib/form-document'
import { createLayoutPreset } from '@/lib/form-document'
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
  Image as ImageIcon,
  Info,
  Trash2,
  Pencil,
  ShieldCheck,
  BadgeCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AppearancePanel } from '@/components/mavenforms/views/appearance-panel'
import { WordPressEmbedPanel } from '@/components/mavenforms/views/wordpress-embed-panel'
import { MediaSourceField } from '@/components/mavenforms/media-source-field'
import { PublicationConsistencyCard } from '@/components/mavenforms/builder/publication-consistency-card'
import { PaymentConnectionWizard } from '@/components/mavenforms/payment-connection-wizard'

const fieldLabels: Record<FieldType, string> = {
  text: 'Metin', paragraph: 'Paragraf', email: 'E-posta', phone: 'Telefon',
  number: 'Sayı', date: 'Tarih', time: 'Saat', checkbox: 'Onay Kutusu',
  radio: 'Seçim', select: 'Liste', dropdown: 'Liste', file: 'Dosya',
  address: 'Adres', signature: 'İmza', rating: 'Puan', price: 'Fiyat',
  matrix: 'Matris', section: 'Bölüm', page_break: 'Sayfa', media: 'Medya',
  hidden: 'Gizli', captcha: 'Captcha',
}

const workspaceGroups = [
  {
    id: 'edit',
    label: 'Düzenle',
    tabs: [
      { id: 'fields', label: 'Alanlar', icon: FileText, description: 'Form alanlarını ve yerleşimini düzenleyin' },
      { id: 'appearance', label: 'Görünüm', icon: Palette, description: 'Header, footer, görseller ve iletişim içeriğini düzenleyin' },
      { id: 'logic', label: 'Mantık', icon: GitBranch, description: 'Koşullu görünürlük ve akış kurallarını yönetin' },
    ],
  },
  {
    id: 'configure',
    label: 'Yapılandır',
    tabs: [
      { id: 'settings', label: 'Ayarlar', icon: Settings, description: 'Form davranışı ve temel bilgileri yönetin' },
      { id: 'notifications', label: 'Bildirim', icon: Bell, description: 'Form bildirimlerini yapılandırın' },
      { id: 'payment', label: 'Ödeme', icon: CreditCard, description: 'Ödeme akışını yapılandırın' },
      { id: 'integrations', label: 'Entegrasyon', icon: Plug, description: 'Harici bağlantıları yönetin' },
    ],
  },
  {
    id: 'share',
    label: 'Paylaş',
    tabs: [
      { id: 'embed', label: 'WordPress', icon: Code2, description: 'Formu dış sitelerde yayınlayın' },
      { id: 'preview', label: 'Önizle', icon: Eye, description: 'Yetkili önizlemeyi açın' },
    ],
  },
  {
    id: 'results',
    label: 'Sonuçlar',
    tabs: [
      { id: 'submissions', label: 'Yanıtlar', icon: Inbox, description: 'Form yanıtlarını görüntüleyin' },
      { id: 'reports', label: 'Rapor', icon: BarChart3, description: 'Form sonuçlarını raporlayın' },
      { id: 'badge', label: 'Yaka kartı', icon: BadgeCheck, description: 'Katılımcı yaka kartı capability durumunu görün' },
    ],
  },
]

const tabs = workspaceGroups.flatMap((group) => group.tabs)

function mediaIdFromValue(value: string | null | undefined) {
  return value?.match(/^\/api\/media\/([^/?]+)(?:\?.*)?$/)?.[1] || null
}

function externalUrlValue(value: string | null | undefined) {
  return value?.startsWith('https://') ? value : null
}

function evaluateLogicRule(rule: LogicRule, values: Record<string, string>) {
  const matches = rule.conditions.conditions.map((condition) => {
    const actual = values[condition.field] || ''
    const expected = condition.value || ''
    if (condition.operator === 'not_equals') return actual !== expected
    if (condition.operator === 'contains') return actual.toLocaleLowerCase().includes(expected.toLocaleLowerCase())
    return actual === expected
  })
  const matched = rule.conditions.type === 'any' ? matches.some(Boolean) : matches.every(Boolean)
  return { matched, actions: matched ? rule.actions : [] }
}

export function FormBuilderView() {
  const { selectedFormId, formDetailTab, selectForm, setView } = useApp()
  const [form, setForm] = useState<FormDetail | null>(null)
  const [fields, setFields] = useState<FormField[]>([])
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [activeTab, setActiveTab] = useState('fields')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (!selectedFormId) {
      setView('forms')
      return
    }
    loadForm()
  }, [selectedFormId])

  useEffect(() => {
    setActiveTab(formDetailTab === 'theme' ? 'appearance' : formDetailTab || 'fields')
  }, [formDetailTab])

  const loadForm = async () => {
    setLoading(true)
    try {
      const data = await api<FormDetail>(`/api/forms/${selectedFormId}`)
      setForm(data)
      setHasUnsavedChanges(false)
      setFields(data.fields.map((field) => ({ ...field, config: normalizeFieldConfig(field.config) })))
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
    setFields((current) => current.map((f) => (f.id === id ? { ...f, ...updates } : f)))
    
    // Debounced save
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      try {
        await api(`/api/forms/${form?.id}/fields/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(updates),
        })
      } catch (err: any) {
        toast({ title: 'Kaydetme hatası', description: err.message, variant: 'destructive' })
      }
    }, 600)
  }

  const resizeField = (id: string, span: number, targetDevice: 'desktop' | 'tablet') => {
    const field = fields.find((item) => item.id === id)
    if (!field) return
    const layout = normalizeFieldLayout(field.config?.layout)
    const key = targetDevice === 'desktop' ? 'colSpan' : 'tabletColSpan'
    updateField(id, {
      config: {
        ...field.config,
        layout: { ...layout, [key]: span },
      },
    })
  }

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
  }, [])

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

  const applyLayoutPreset = async (presetId: string) => {
    if (!form || fields.length === 0) return
    const layouts = createLayoutPreset(presetId, fields.length)
    const nextFields = fields.map((field, index) => ({
      ...field,
      config: { ...field.config, layout: layouts[index] },
    }))
    setFields(nextFields)
    try {
      await api(`/api/forms/${form.id}/fields`, {
        method: 'PATCH',
        body: JSON.stringify({ updates: nextFields.map((field) => ({ id: field.id, config: field.config })) }),
      })
      toast({ title: 'Yerleşim uygulandı', description: 'Responsive Grid/Bento düzeni kaydedildi' })
    } catch (err: any) {
      toast({ title: 'Yerleşim kaydedilemedi', description: err.message, variant: 'destructive' })
      await loadForm()
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
      setHasUnsavedChanges(false)
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
      setHasUnsavedChanges(false)
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
    <div className="flex min-h-0 min-w-0 flex-col h-[calc(100vh-4rem)]">
      {/* Top toolbar */}
      <div className="flex shrink-0 items-center gap-3 p-3 border-b border-border bg-background/80 backdrop-blur">
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setView('forms')}>
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Formlar</span>
        </Button>

        <Separator orientation="vertical" className="h-6" />

        <div className="flex-1 min-w-0">
          <Input
            value={form.title}
            onChange={(e) => {
              setForm({ ...form, title: e.target.value })
              setHasUnsavedChanges(true)
            }}
            className="h-8 border-0 px-1 text-sm font-medium hover:border-input focus-visible:border-input bg-transparent"
          />
        </div>

        <div className="flex shrink-0 items-center gap-1.5" aria-live="polite">
          <Badge variant="outline" className={cn('gap-1.5', status.bg, status.color)}>
            <span className={cn('w-1.5 h-1.5 rounded-full', status.dot)} />
            {status.label}
          </Badge>
          {form.status === 'published' && hasUnsavedChanges && (
            <Badge variant="outline" className="hidden gap-1.5 border-amber-500/30 bg-amber-500/10 text-amber-700 sm:inline-flex dark:text-amber-300">
              Yayınlanmamış değişiklikler var
            </Badge>
          )}
        </div>

        <div className="hidden md:flex items-center gap-1 p-0.5 bg-muted rounded-lg border border-border">
          {[
            { id: 'desktop', icon: Monitor },
            { id: 'tablet', icon: Tablet },
            { id: 'mobile', icon: Smartphone },
          ].map((d) => (
            <button
              type="button"
              key={d.id}
              onClick={() => setDevice(d.id as any)}
              aria-label={`Önizleme: ${d.id}`}
              aria-pressed={device === d.id}
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
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Geri al" aria-label="Geri al (yakında)" disabled>
            <Undo2 className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="İleri al" aria-label="İleri al (yakında)" disabled>
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
          <span className="hidden sm:inline">Formu kaydet</span>
        </Button>

        <Button size="sm" className="gap-1.5" onClick={handlePublish} disabled={publishing}>
          {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">Yayınla</span>
        </Button>
      </div>

      {/* Tabs */}
      <div className="shrink-0 border-b border-border bg-muted/30">
        <div className="flex items-center gap-1 overflow-x-auto px-3 pt-2" role="tablist" aria-label="Form çalışma alanları">
          {workspaceGroups.map((group) => {
            const activeWorkspace = group.tabs.some((tab) => tab.id === activeTab)
            return (
              <button
                type="button"
                key={group.id}
                role="tab"
                aria-selected={activeWorkspace}
                onClick={() => setActiveTab(group.tabs[0].id)}
                className={cn(
                  'flex items-center gap-1.5 whitespace-nowrap rounded-t-md px-3 py-1.5 text-xs font-medium transition-colors',
                  activeWorkspace
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'
                )}
              >
                {group.label}
              </button>
            )
          })}
        </div>
        {(() => {
          const activeWorkspace = workspaceGroups.find((group) => group.tabs.some((tab) => tab.id === activeTab)) || workspaceGroups[0]
          return (
            <div className="flex items-center gap-1 overflow-x-auto px-3 py-1.5" role="tablist" aria-label={`${activeWorkspace.label} sekmeleri`}>
              {activeWorkspace.tabs.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  role="tab"
                  aria-selected={activeTab === t.id}
                  onClick={() => setActiveTab(t.id)}
                  aria-current={activeTab === t.id ? 'page' : undefined}
                  aria-label={`${t.label}: ${t.description}`}
                  title={t.description}
                  className={cn(
                    'flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
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
          )
        })()}
      </div>

      {/* Content based on tab */}
      {activeTab === 'fields' && (
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Field palette */}
          <div className="w-64 shrink-0 border-r border-border bg-card hidden md:block">
            <FieldPalette onAdd={addField} fieldCount={fields.length} onApplyLayout={applyLayoutPreset} />
          </div>

          {/* Canvas */}
          <BuilderCanvas
            fields={fields}
            selectedId={selectedFieldId}
            onSelect={setSelectedFieldId}
            onReorder={reorderField}
            onDelete={deleteField}
            onDuplicate={duplicateField}
            onUpdate={updateField}
            onDropField={addField}
            onAddPlaceholder={() => addField('text')}
            formId={form.id}
            formTitle={form.title}
            formDescription={form.description || ''}
            device={device}
            onResizeField={resizeField}
          />

          {/* Properties */}
          <div className="w-80 min-h-0 shrink-0 overflow-hidden border-l border-border bg-card hidden lg:block">
            <PropertiesPanel
              formId={form.id}
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

      {activeTab === 'settings' && <FormSettingsPanel form={form} onUpdate={(updates) => { setForm({ ...form, ...updates }); setHasUnsavedChanges(true) }} onSave={handleSave} />}

      {activeTab === 'appearance' && (
        <AppearancePanel
          formId={form.id}
          formSlug={form.slug}
          formTitle={form.title}
          formDescription={form.description ?? null}
          themePanel={<ThemePanel form={form} />}
        />
      )}

      {activeTab === 'embed' && <WordPressEmbedPanel form={form} />}

      {activeTab === 'preview' && <BuilderPreview form={form} />}

      {activeTab === 'badge' && <BadgeCapabilityPanel form={form} />}

      {activeTab !== 'fields' && activeTab !== 'settings' && activeTab !== 'appearance' && activeTab !== 'embed' && activeTab !== 'preview' && activeTab !== 'badge' && activeTab !== 'theme' && (
        <ComingSoonPanel tab={activeTab} form={form} />
      )}
    </div>
  )
}

function BuilderPreview({ form }: { form: FormDetail }) {
  return (
    <div className="min-h-0 flex-1 overflow-auto bg-muted/20 p-4 lg:p-6">
      <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-xl border border-border bg-background shadow-sm">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Form önizleme</h2>
          <p className="text-xs text-muted-foreground">Kaydedilmiş taslağın yalnızca yetkili çalışma alanı görünümü</p>
        </div>
        <iframe
          title={`${form.title} önizleme`}
          src={`/forms/${encodeURIComponent(form.slug)}?preview=1`}
          className="block h-[min(720px,75vh)] min-h-[520px] w-full border-0"
          sandbox="allow-forms allow-scripts allow-same-origin allow-popups"
        />
      </div>
    </div>
  )
}

type BadgeCapabilityResponse = {
  formId: string
  eligibleSubmissionCount: number
  entrySurfaces: {
    formDetail: { visibility: 'VISIBLE' | 'DISABLED' | 'HIDDEN'; reason: string }
    submissionSelection: { visibility: 'VISIBLE' | 'DISABLED' | 'HIDDEN'; reason: string }
  }
}

type BadgeArtifactListItem = {
  artifactId: string
  outputId: string
  state: 'QUARANTINED' | 'READY' | 'BLOCKED'
  downloadable: boolean
  sizeBytes: number
  downloadUrl?: string
}

type BadgeTemplateCatalogItem = {
  templateId: string
  versionId: string
  originalName: string
  pageCount: 1 | 2
  widthPt: number
  heightPt: number
  visibility: 'private'
  validationStatus: 'VALIDATED'
}

type BadgeSubmissionOption = {
  id: string
  submittedAt: string
  submitter?: { name: string | null; email: string } | null
}

function BadgeCapabilityPanel({ form }: { form: FormDetail }) {
  const [capability, setCapability] = useState<BadgeCapabilityResponse | null>(null)
  const [artifacts, setArtifacts] = useState<BadgeArtifactListItem[]>([])
  const [templates, setTemplates] = useState<BadgeTemplateCatalogItem[]>([])
  const [submissionOptions, setSubmissionOptions] = useState<BadgeSubmissionOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [templateUploadState, setTemplateUploadState] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [templateUploadError, setTemplateUploadError] = useState<string | null>(null)
  const [templateSelection, setTemplateSelection] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [templateSelectionError, setTemplateSelectionError] = useState<string | null>(null)
  const [generationState, setGenerationState] = useState<'idle' | 'starting' | 'success' | 'error'>('idle')
  const [generationMessage, setGenerationMessage] = useState<string | null>(null)
  const [exportState, setExportState] = useState<'idle' | 'exporting' | 'error'>('idle')
  const [generationMode, setGenerationMode] = useState<'ALL' | 'SINGLE'>('ALL')
  const [generationSubmissionId, setGenerationSubmissionId] = useState('')

  const selectedTemplateVersionId = typeof (form.settings as FormDetail['settings'] & { badge?: { templateVersionId?: unknown } }).badge?.templateVersionId === 'string'
    ? (form.settings as FormDetail['settings'] & { badge?: { templateVersionId: string } }).badge?.templateVersionId
    : null
  const selectedTemplate = templates.find(template => template.versionId === selectedTemplateVersionId)

  async function loadTemplates() {
    const data = await api<{ templates: BadgeTemplateCatalogItem[] }>(`/api/forms/${form.id}/badges/templates/catalog`)
    setTemplates(data.templates)
  }

  async function generateBadges() {
    if (!selectedTemplate) return
    setGenerationState('starting')
    setGenerationMessage(null)
    try {
      const response = await fetch(`/api/forms/${encodeURIComponent(form.id)}/badges/generate`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: selectedTemplate.templateId, templateVersionId: selectedTemplate.versionId, selectionMode: generationMode, submissionIds: generationMode === 'SINGLE' ? [generationSubmissionId] : [], faceMode: selectedTemplate.pageCount === 2 ? 'DUAL_FACE' : 'SINGLE_FACE' }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.error || 'Yaka kartları üretilemedi.')
      setGenerationState('success')
      setGenerationMessage(`${result?.data?.createdCount ?? 0} çıktı karantinaya alındı; tarama geçişi bekleniyor.`)
      const artifactData = await api<{ artifacts: BadgeArtifactListItem[] }>(`/api/forms/${form.id}/badges/artifacts`)
      setArtifacts(artifactData.artifacts)
    } catch (err: any) {
      setGenerationState('error')
      setGenerationMessage(err?.message || 'Yaka kartları üretilemedi.')
    }
  }

  async function exportBadges(format: 'ZIP' | 'COMBINED_PDF') {
    const artifactIds = artifacts.filter(artifact => artifact.state === 'READY' && artifact.downloadable).map(artifact => artifact.artifactId)
    if (!artifactIds.length) return setGenerationMessage('Export için taramadan geçmiş READY çıktı bulunmuyor.')
    setExportState('exporting')
    try {
      const response = await fetch(`/api/forms/${encodeURIComponent(form.id)}/badges/export`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ artifactIds, format }) })
      if (!response.ok) {
        const result = await response.json().catch(() => null)
        throw new Error(result?.error || 'Export hazırlanamadı.')
      }
      const url = window.URL.createObjectURL(await response.blob())
      const link = document.createElement('a')
      link.href = url
      link.download = format === 'ZIP' ? 'yaka-karti-export.zip' : 'yaka-karti-birlesik.pdf'
      link.click()
      window.URL.revokeObjectURL(url)
      setExportState('idle')
    } catch (err: any) {
      setExportState('error')
      setGenerationMessage(err?.message || 'Export hazırlanamadı.')
    }
  }

  async function uploadTemplate(file: File) {
    setTemplateUploadState('uploading')
    setTemplateUploadError(null)
    const body = new FormData()
    body.append('file', file)
    try {
      const response = await fetch(`/api/forms/${encodeURIComponent(form.id)}/badges/templates`, { method: 'POST', body, credentials: 'include' })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || 'PDF şablonu yüklenemedi.')
      setTemplateUploadState('success')
      await loadTemplates()
    } catch (err: any) {
      setTemplateUploadState('error')
      setTemplateUploadError(err?.message || 'PDF şablonu yüklenemedi.')
    }
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    Promise.all([
      api<BadgeCapabilityResponse>(`/api/forms/${form.id}/badges`),
      api<{ artifacts: BadgeArtifactListItem[] }>(`/api/forms/${form.id}/badges/artifacts`),
      api<{ templates: BadgeTemplateCatalogItem[] }>(`/api/forms/${form.id}/badges/templates/catalog`),
      api<BadgeSubmissionOption[]>(`/api/forms/${form.id}/submissions?page=1&pageSize=100&status=all`),
    ])
      .then(([data, artifactData, templateData, submissionData]) => {
        if (!active) return
        setCapability(data)
        setArtifacts(artifactData.artifacts)
        setTemplates(templateData.templates)
        setSubmissionOptions((Array.isArray(submissionData) ? submissionData : []).filter(submission => Boolean(submission.id)))
      })
      .catch((err: any) => { if (active) setError(err?.message || 'Yaka kartı durumu alınamadı.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [form.id])

  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="mx-auto w-full max-w-4xl space-y-6 p-4 lg:p-6">
        <div>
          <div className="flex items-center gap-2">
            <BadgeCheck className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Yaka kartı</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Katılımcı kayıtlarından yaka kartı üretimi için capability durumunu görüntüleyin.</p>
        </div>

        {loading && (
          <Card className="flex items-center gap-2 p-5 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Capability durumu kontrol ediliyor…
          </Card>
        )}

        {error && <Alert variant="destructive"><AlertTitle>Durum alınamadı</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

        {capability && (
          <>
            <Card className="space-y-5 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">İç pilot hazırlığı</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Tekil veya tüm uygun kayıtlar için çıktı hazırlayabilirsiniz; dosyalar önce güvenli taramaya alınır.</p>
                </div>
                <Badge variant={capability.eligibleSubmissionCount > 0 && form.status === 'published' ? 'default' : 'secondary'}>
                  {capability.eligibleSubmissionCount > 0 && form.status === 'published' ? 'Giriş uygun' : 'Hazırlık gerekli'}
                </Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border p-4">
                  <div className="text-2xl font-semibold">{capability.eligibleSubmissionCount}</div>
                  <div className="text-xs text-muted-foreground">Uygun katılımcı kaydı</div>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <div className="flex items-center gap-2 text-sm font-medium"><ShieldCheck className="h-4 w-4 text-primary" /> Kapsam korumalı</div>
                  <div className="mt-1 text-xs text-muted-foreground">Workspace ve form sınırı server tarafında doğrulanır.</div>
                </div>
              </div>
            </Card>
            <Card className="space-y-4 p-5">
              <div>
                <h3 className="font-semibold">PDF şablonu</h3>
                <p className="mt-1 text-sm text-muted-foreground">1 yüz veya 2 yüz, yalnız PDF. Şablon bu formun private alanında doğrulanarak saklanır.</p>
              </div>
              <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-border px-4 text-sm font-medium hover:bg-muted focus-within:outline-none focus-within:ring-2 focus-within:ring-ring">
                {templateUploadState === 'uploading' ? 'Yükleniyor…' : 'PDF şablonu yükle'}
                <input className="sr-only" type="file" accept="application/pdf,.pdf" disabled={templateUploadState === 'uploading'} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadTemplate(file); event.currentTarget.value = '' }} />
              </label>
              {templateUploadState === 'success' && <p className="text-sm text-primary">PDF şablonu doğrulandı ve private alana alındı.</p>}
              {templateUploadError && <p className="text-sm text-destructive">{templateUploadError}</p>}
              <div className="border-t border-border pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-semibold">Kullanılacak şablon sürümü</h4>
                    <p className="mt-1 text-xs text-muted-foreground">Üretim başlamadan önce bu form için tek bir doğrulanmış sürüm seçin.</p>
                  </div>
                  <Badge variant="secondary">{templates.length} sürüm</Badge>
                </div>
                {!templates.length && <p className="mt-3 rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">Seçilebilir şablon yok. Önce private PDF yükleyin.</p>}
                {!!templates.length && (
                  <div className="mt-3 space-y-2">
                    {templates.map((template) => {
                      const selected = selectedTemplateVersionId === template.versionId
                      return (
                        <div key={template.versionId} className={cn('flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3', selected ? 'border-primary bg-primary/5' : 'border-border')}>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">{template.originalName}</div>
                            <div className="text-xs text-muted-foreground">{template.pageCount === 2 ? 'Çift yüz' : 'Tek yüz'} · {Math.round(template.widthPt)}×{Math.round(template.heightPt)} pt · {template.versionId}</div>
                          </div>
                          <Button type="button" size="sm" variant={selected ? 'default' : 'outline'} disabled={templateSelection === 'saving' || selected} onClick={async () => {
                            setTemplateSelection('saving')
                            setTemplateSelectionError(null)
                            try {
                              const response = await fetch(`/api/forms/${encodeURIComponent(form.id)}/badges/templates/selection`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ templateId: template.templateId, versionId: template.versionId }) })
                              const result = await response.json().catch(() => null)
                              if (!response.ok) throw new Error(result?.error || 'Şablon seçilemedi.')
                              setTemplateSelection('saved')
                              window.location.reload()
                            } catch (err: any) {
                              setTemplateSelection('error')
                              setTemplateSelectionError(err?.message || 'Şablon seçilemedi.')
                            }
                          }}>{selected ? 'Seçili' : 'Bu sürümü seç'}</Button>
                        </div>
                      )
                    })}
                  </div>
                )}
                {templateSelection === 'saved' && <p className="mt-2 text-sm text-primary">Şablon sürümü forma bağlandı.</p>}
                {templateSelectionError && <p className="mt-2 text-sm text-destructive">{templateSelectionError}</p>}
                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
                  <select aria-label="Yaka kartı üretim kapsamı" className="h-10 rounded-md border border-border bg-background px-3 text-sm" value={generationMode} onChange={(event) => { const next = event.target.value as 'ALL' | 'SINGLE'; setGenerationMode(next); if (next === 'ALL') setGenerationSubmissionId('') }}>
                    <option value="ALL">Tüm uygun kayıtlar</option>
                    <option value="SINGLE">Tek kayıt</option>
                  </select>
                  {generationMode === 'SINGLE' && (
                    <select aria-label="Yaka kartı kaydı" className="h-10 min-w-56 rounded-md border border-border bg-background px-3 text-sm" value={generationSubmissionId} onChange={(event) => setGenerationSubmissionId(event.target.value)}>
                      <option value="">Kayıt seçin…</option>
                      {submissionOptions.map((submission) => <option key={submission.id} value={submission.id}>{submission.submitter?.name || submission.submitter?.email || submission.id}</option>)}
                    </select>
                  )}
                  <Button type="button" disabled={!selectedTemplate || generationState === 'starting' || (generationMode === 'SINGLE' && !generationSubmissionId)} onClick={() => void generateBadges()}>
                    {generationState === 'starting' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {generationState === 'starting' ? 'Üretiliyor…' : 'Uygun kayıtları üret'}
                  </Button>
                  {!selectedTemplate && <span className="text-xs text-muted-foreground">Üretim için önce bir şablon sürümü seçin.</span>}
                  {generationMode === 'SINGLE' && !generationSubmissionId && <span className="text-xs text-muted-foreground">Tekil üretim için kayıt seçin.</span>}
                </div>
                {generationMessage && <p className={cn('text-sm', generationState === 'error' ? 'text-destructive' : 'text-primary')}>{generationMessage}</p>}
              </div>
            </Card>
            <Card className="p-5">
              <h3 className="font-semibold">Giriş yüzeyleri</h3>
              <div className="mt-4 space-y-3">
                {[
                  ['Form detayından giriş', capability.entrySurfaces.formDetail],
                  ['Yanıt seçiminden giriş', capability.entrySurfaces.submissionSelection],
                ].map(([label, surface]) => {
                  const decision = surface as BadgeCapabilityResponse['entrySurfaces']['formDetail']
                  return (
                    <div key={label as string} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3">
                      <span className="text-sm">{label as string}</span>
                      <Badge variant={decision.visibility === 'VISIBLE' ? 'default' : 'secondary'}>{decision.visibility === 'VISIBLE' ? 'Hazır' : decision.reason}</Badge>
                    </div>
                  )
                })}
              </div>
            </Card>
            <Card className="space-y-4 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">Üretilen çıktılar</h3>
                  <p className="mt-1 text-sm text-muted-foreground">PDF çıktıları önce tarama karantinasında tutulur. Yalnız READY olanlar indirilebilir.</p>
                </div>
                <Badge variant="secondary">{artifacts.length} çıktı</Badge>
              </div>
              {!artifacts.length && <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">Bu form için henüz yaka kartı çıktısı yok.</p>}
              {!!artifacts.length && (
                <div className="space-y-2">
                  {artifacts.map((artifact) => (
                    <div key={artifact.artifactId} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">Çıktı {artifact.outputId}</div>
                        <div className="text-xs text-muted-foreground">{artifact.state === 'READY' ? 'İndirmeye hazır' : artifact.state === 'QUARANTINED' ? 'Tarama bekliyor' : 'Engellendi'} · {artifact.sizeBytes.toLocaleString('tr-TR')} byte</div>
                      </div>
                      {artifact.downloadUrl ? <a className="inline-flex min-h-11 items-center rounded-md border border-border px-3 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href={artifact.downloadUrl}>PDF indir</a> : <Badge variant="secondary">İndirme kapalı</Badge>}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                <Button type="button" variant="outline" disabled={exportState === 'exporting' || !artifacts.some(artifact => artifact.state === 'READY' && artifact.downloadable)} onClick={() => void exportBadges('COMBINED_PDF')}>Birleşik PDF indir</Button>
                <Button type="button" variant="outline" disabled={exportState === 'exporting' || !artifacts.some(artifact => artifact.state === 'READY' && artifact.downloadable)} onClick={() => void exportBadges('ZIP')}>ZIP paket indir</Button>
                {exportState === 'exporting' && <span className="self-center text-xs text-muted-foreground">Export hazırlanıyor…</span>}
              </div>
            </Card>
            <Alert><Info className="h-4 w-4" /><AlertTitle>Güvenli çıktı akışı</AlertTitle><AlertDescription>Generation worker çıktıyı önce özel karantinaya alır. İç tarama geçişi olmadan PDF indirilemez; READY çıktılar yalnız yetkili authenticated bağlantıdan alınır.</AlertDescription></Alert>
          </>
        )}
      </div>
    </ScrollArea>
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
    <ScrollArea className="min-h-0 flex-1">
      <div className="mx-auto grid w-full max-w-6xl gap-6 p-4 lg:grid-cols-[250px_minmax(0,1fr)] lg:p-6">
        <FormSettingsPreview form={form} />

        <div className="min-w-0 space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-1">Form Ayarları</h2>
            <p className="text-sm text-muted-foreground">Genel form davranışını yapılandırın</p>
          </div>

          <div className="space-y-2">
            <Label>Form adı (katılımcı görünümü)</Label>
            <Input value={form.title} onChange={(e) => onUpdate({ title: e.target.value })} />
            <p className="text-xs text-muted-foreground">Form kartında ve yayınlanan formun ana başlığında görünür.</p>
          </div>

          <div className="space-y-2">
            <Label>Açıklama (katılımcı görünümü)</Label>
            <Textarea
              value={form.description || ''}
              onChange={(e) => onUpdate({ description: e.target.value })}
              rows={2}
            />
            <p className="text-xs text-muted-foreground">Form kartında ve yayınlanan formun giriş bölümünde görünür.</p>
          </div>

          <PublicationConsistencyCard form={form} />

          <div className="space-y-3 rounded-lg border border-border p-4">
            <div>
              <Label>Form kart görseli (16:9)</Label>
              <p className="text-xs text-muted-foreground">Kart ve form listelerinde gösterilir. Yayınlanan formun header görseli Görünüm sekmesinden ayrı yönetilir.</p>
            </div>
            <MediaSourceField
              formId={form.id}
              mediaId={form.settings?.coverMediaId || mediaIdFromValue(form.settings?.coverImageUrl) || null}
              externalUrl={externalUrlValue(form.settings?.coverImageUrl)}
              onMediaChange={(id) => onUpdate({
                settings: {
                  ...form.settings,
                  coverMediaId: id,
                  coverImageUrl: id ? null : externalUrlValue(form.settings?.coverImageUrl),
                },
              })}
              onExternalUrlChange={(value) => onUpdate({
                settings: {
                  ...form.settings,
                  coverImageUrl: value || null,
                  coverMediaId: null,
                },
              })}
              externalPlaceholder="https://example.com/cover.jpg"
              label="Kapak görseli kaynağı"
            />
            <Input
              value={form.settings?.coverImageAlt || ''}
              onChange={(e) => onUpdate({ settings: { ...form.settings, coverImageAlt: e.target.value } })}
              placeholder="Görsel alt metni"
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

function FormSettingsPreview({ form }: { form: FormDetail }) {
  const coverMediaId = form.settings?.coverMediaId || mediaIdFromValue(form.settings?.coverImageUrl)
  const coverImage = coverMediaId
    ? `/api/media/${coverMediaId}?formId=${form.id}`
    : form.settings?.coverImageUrl || null
  const previewFields = form.fields.slice(0, 3)

  return (
    <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start" aria-label="Form ayarları örnek görünümü">
      <Card className="overflow-hidden border-primary/20 bg-muted/20 shadow-sm">
        <div className="flex items-start justify-between gap-2 border-b border-border/70 px-3 py-3">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.14em] text-primary">ÖRNEK GÖRÜNÜM</p>
            <p className="mt-1 text-xs text-muted-foreground">Katılımcının göreceği yapı</p>
          </div>
          <Badge variant="secondary" className="shrink-0 text-[10px]">Taslak</Badge>
        </div>

        <div className="p-3">
          <div className="overflow-hidden rounded-lg border border-border bg-background shadow-sm" role="img" aria-label="Formun küçük örnek görünümü">
            <div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-50 via-slate-50 to-violet-100">
              {coverImage ? (
                <img src={coverImage} alt="" className="h-full w-full object-cover" />
              ) : (
                <>
                  <ImageIcon className="h-8 w-8 text-primary/40" />
                  <span className="absolute bottom-2 rounded bg-background/80 px-2 py-1 text-[9px] text-muted-foreground">16:9 kapak görseli</span>
                </>
              )}
            </div>

            <div className="space-y-3 p-3">
              <div>
                <h3 className="line-clamp-2 text-sm font-semibold leading-tight">{form.title || 'Form başlığı'}</h3>
                <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-muted-foreground">{form.description || 'Form açıklaması burada görünür.'}</p>
              </div>

              <div className="space-y-2">
                {(previewFields.length ? previewFields : [{ id: 'name', label: 'Ad Soyad' }, { id: 'email', label: 'E-posta' }]).map((field) => (
                  <div key={field.id} className="space-y-1">
                    <div className="text-[10px] font-medium">{field.label}</div>
                    <div className="h-7 rounded border border-border bg-muted/20 px-2 py-1.5 text-[9px] text-muted-foreground">Yanıtınızı yazın…</div>
                  </div>
                ))}
                <div className="h-7 rounded bg-primary px-2 py-1.5 text-center text-[10px] font-medium text-primary-foreground">{form.settings?.submitButtonText || 'Gönder'}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2 border-t border-border/70 px-3 py-3 text-[11px]">
          <div className="flex items-start gap-2"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /><span>Bu panel örnek amaçlıdır; değişiklikleri yayınlamadan önce <strong>Önizle</strong> ile gerçek form akışını test edin.</span></div>
          <div className="grid gap-1.5 text-muted-foreground">
            <span><strong className="text-foreground">Kapak:</strong> 16:9 · önerilen 1600×900 px</span>
            <span><strong className="text-foreground">Dosya:</strong> PNG, JPEG veya WebP · en fazla 5 MB</span>
            <span><strong className="text-foreground">Mobil:</strong> önemli içerikleri merkeze yakın tutun</span>
          </div>
        </div>
      </Card>

      <Card className="border-border/70 bg-background p-3 shadow-sm">
        <p className="text-xs font-semibold">Ayar kontrolü</p>
        <div className="mt-2 space-y-2 text-[11px] text-muted-foreground">
          <p><strong className="text-foreground">Form adı:</strong> başlık ve paylaşım ekranında görünür.</p>
          <p><strong className="text-foreground">Yanıt limiti:</strong> dolduğunda public form yeni gönderimi durdurur.</p>
          <p><strong className="text-foreground">Captcha:</strong> açık olduğunda public gönderimlerde ek spam kontrolü uygulanır.</p>
        </div>
      </Card>
    </aside>
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

const themePresets: Array<{ name: string; colors: string[]; tokens: ThemeTokens }> = [
  { name: 'Vibrant', colors: ['#7c3aed', '#ec4899', '#f59e0b'], tokens: { primary: '#7c3aed', background: '#ffffff', text: '#0f172a', error: '#ef4444', success: '#10b981', warning: '#f59e0b' } },
  { name: 'Light', colors: ['#ffffff', '#f3f4f6', '#10b981'], tokens: { primary: '#10b981', background: '#ffffff', text: '#1f2937', error: '#dc2626', success: '#16a34a', warning: '#d97706' } },
  { name: 'Dark', colors: ['#1f2937', '#374151', '#6366f1'], tokens: { primary: '#6366f1', background: '#111827', text: '#f9fafb', error: '#f87171', success: '#34d399', warning: '#fbbf24' } },
  { name: 'Emerald', colors: ['#059669', '#10b981', '#f0fdf4'], tokens: { primary: '#059669', background: '#f0fdf4', text: '#064e3b', error: '#dc2626', success: '#059669', warning: '#d97706' } },
  { name: 'Sunset', colors: ['#f97316', '#fb923c', '#fef3c7'], tokens: { primary: '#f97316', background: '#fffbeb', text: '#431407', error: '#dc2626', success: '#16a34a', warning: '#f59e0b' } },
]

function ThemePanel({ form }: { form: FormDetail }) {
  const { toast } = useToast()
  const currentTheme = form.themes[0]
  const [name, setName] = useState(currentTheme?.name || 'Custom')
  const [tokens, setTokens] = useState<ThemeTokens>(currentTheme?.tokens || themePresets[1].tokens)
  const [font, setFont] = useState(currentTheme?.font || 'Inter')
  const [radius, setRadius] = useState(currentTheme?.radius ?? 0.625)
  const [customCss, setCustomCss] = useState(currentTheme?.customCss || '')
  const [savingTheme, setSavingTheme] = useState(false)

  useEffect(() => {
    setName(currentTheme?.name || 'Custom')
    setTokens(currentTheme?.tokens || themePresets[1].tokens)
    setFont(currentTheme?.font || 'Inter')
    setRadius(currentTheme?.radius ?? 0.625)
    setCustomCss(currentTheme?.customCss || '')
  }, [currentTheme])

  const saveTheme = async (next: { name: string; tokens: ThemeTokens; font: string; radius: number; customCss: string }) => {
    setSavingTheme(true)
    try {
      await api(`/api/forms/${form.id}/theme`, { method: 'PATCH', body: JSON.stringify(next) })
      toast({ title: 'Tema taslağı kaydedildi', description: 'Public görünüm için formu yeniden yayınlayın' })
    } catch (err: any) {
      toast({ title: 'Tema kaydedilemedi', description: err.message, variant: 'destructive' })
    } finally {
      setSavingTheme(false)
    }
  }

  const applyPreset = (preset: typeof themePresets[number]) => {
    const next = { name: preset.name, tokens: preset.tokens, font, radius, customCss }
    setName(next.name)
    setTokens(next.tokens)
    void saveTheme(next)
  }

  const tokenFields: Array<{ key: keyof ThemeTokens; label: string; fallback: string }> = [
    { key: 'primary', label: 'Primary', fallback: '#10b981' },
    { key: 'background', label: 'Background', fallback: '#ffffff' },
    { key: 'text', label: 'Text', fallback: '#1a1a1a' },
    { key: 'error', label: 'Error', fallback: '#dc2626' },
    { key: 'success', label: 'Success', fallback: '#16a34a' },
    { key: 'warning', label: 'Warning', fallback: '#d97706' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Tema ve stil</h2>
        <p className="text-sm text-muted-foreground">Form teması yalnız seçili formun public renk, tipografi ve stil sistemini yönetir. Uygulama panelinin teması Ayarlar içindeki Uygulama teması bölümünden değiştirilir.</p>
      </div>
      <Card className="p-5">
        <h3 className="font-medium mb-3">Hazır Temalar</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {themePresets.map((t) => (
            <button
              key={t.name}
              type="button"
              onClick={() => applyPreset(t)}
              disabled={savingTheme}
              aria-pressed={name === t.name}
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
          {tokenFields.map((c) => {
            const value = tokens[c.key] || c.fallback
            return (
            <div key={c.key} className="flex items-center gap-2">
              <input type="color" value={value} onChange={(event) => setTokens({ ...tokens, [c.key]: event.target.value })} className="w-10 h-10 rounded border border-border" aria-label={`${c.label} rengi`} />
              <div>
                <div className="text-xs font-medium">{c.label}</div>
                <input value={value} onChange={(event) => setTokens({ ...tokens, [c.key]: event.target.value })} className="text-xs font-mono bg-transparent border-0 p-0 w-24" aria-label={`${c.label} hex değeri`} />
              </div>
            </div>
            )
          })}
        </div>
      </Card>

      <Card className="p-5 space-y-3">
        <h3 className="font-medium">Tipografi</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Font Ailesi</Label>
            <select value={font} onChange={(event) => setFont(event.target.value)} className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm">
              <option>Inter</option>
              <option>Roboto</option>
              <option>Open Sans</option>
              <option>Poppins</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Köşe Yarıçapı</Label>
          <Input type="number" value={radius} onChange={(event) => setRadius(Number(event.target.value))} step={0.1} min={0} max={2} />
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-medium mb-3">Özel CSS</h3>
        <Textarea
          rows={6}
          placeholder=".mavenforms-form { /* özel stiller */ }"
          className="font-mono text-xs"
          value={customCss}
          onChange={(event) => setCustomCss(event.target.value)}
        />
      </Card>

      <div className="flex justify-end">
        <Button type="button" onClick={() => saveTheme({ name, tokens, font, radius, customCss })} disabled={savingTheme} className="gap-1.5">
          {savingTheme ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {savingTheme ? 'Kaydediliyor…' : 'Tema ayarlarını kaydet'}
        </Button>
      </div>
    </div>
  )
}

function LogicPanel({ form }: { form: FormDetail }) {
  const { toast } = useToast()
  const [rules, setRules] = useState<LogicRule[]>(form.logicRules)
  const [enabledById, setEnabledById] = useState<Record<string, boolean>>(() => Object.fromEntries(form.logicRules.map((rule) => [rule.id, rule.enabled])))
  const [savingId, setSavingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)
  const [ruleName, setRuleName] = useState('')
  const [conditionType, setConditionType] = useState<'all' | 'any'>('all')
  const [conditionRows, setConditionRows] = useState<Array<{ field: string; operator: string; value: string }>>([{ field: form.fields[0]?.fieldKey || '', operator: 'equals', value: '' }])
  const [actionType, setActionType] = useState<LogicRule['actions'][number]['type']>('show')
  const [actionTarget, setActionTarget] = useState(form.fields[0]?.fieldKey || '')
  const [testValues, setTestValues] = useState<Record<string, string>>({})
  const [testResult, setTestResult] = useState<Array<{ rule: LogicRule; actions: LogicRule['actions'] }> | null>(null)

  useEffect(() => {
    setRules(form.logicRules)
    setEnabledById(Object.fromEntries(form.logicRules.map((rule) => [rule.id, rule.enabled])))
  }, [form.logicRules])

  const toggleRule = async (id: string, enabled: boolean) => {
    const previous = enabledById[id]
    setEnabledById((current) => ({ ...current, [id]: enabled }))
    setSavingId(id)
    try {
      await api(`/api/forms/${form.id}/logic/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled }),
      })
      toast({ title: enabled ? 'Kural etkinleştirildi' : 'Kural duraklatıldı' })
    } catch (err: any) {
      setEnabledById((current) => ({ ...current, [id]: previous }))
      toast({ title: 'Kural güncellenemedi', description: err.message, variant: 'destructive' })
    } finally {
      setSavingId(null)
    }
  }

  const deleteRule = async (rule: LogicRule) => {
    if (!confirm(`“${rule.name || `Kural ${rule.priority}`}” silinsin mi?`)) return
    try {
      await api(`/api/forms/${form.id}/logic/${rule.id}`, { method: 'DELETE' })
      setRules((current) => current.filter((candidate) => candidate.id !== rule.id))
      setEnabledById((current) => {
        const next = { ...current }
        delete next[rule.id]
        return next
      })
      setTestResult((current) => current?.filter((result) => result.rule.id !== rule.id) || null)
      toast({ title: 'Kural silindi' })
    } catch (err: any) {
      toast({ title: 'Kural silinemedi', description: err.message, variant: 'destructive' })
    }
  }

  const startRuleEdit = (rule: LogicRule) => {
    setEditingRuleId(rule.id)
    setIsAdding(false)
    setRuleName(rule.name || '')
    setConditionType(rule.conditions.type)
    setConditionRows(rule.conditions.conditions.map((condition) => ({ ...condition })))
    setActionType(rule.actions[0]?.type || 'show')
    setActionTarget(rule.actions[0]?.target || form.fields[0]?.fieldKey || '')
    setTestResult(null)
  }

  const saveRuleEdit = async () => {
    if (!editingRuleId) return
    if (conditionRows.some((condition) => !condition.field || !condition.value.trim()) || !actionTarget) {
      toast({ title: 'Kural bilgileri eksik', description: 'Tüm koşul alanları, değerleri ve aksiyon hedefi gereklidir', variant: 'destructive' })
      return
    }
    const currentRule = rules.find((rule) => rule.id === editingRuleId)
    if (!currentRule) return
    const updates = {
      name: ruleName.trim() || currentRule.name || `Kural ${currentRule.priority}`,
      conditions: { type: conditionType, conditions: conditionRows.map((condition) => ({ ...condition, value: condition.value.trim() })) },
      actions: [{ type: actionType, target: actionTarget }],
    }
    try {
      await api(`/api/forms/${form.id}/logic/${editingRuleId}`, { method: 'PATCH', body: JSON.stringify(updates) })
      setRules((current) => current.map((rule) => rule.id === editingRuleId ? { ...rule, ...updates } : rule))
      setEditingRuleId(null)
      toast({ title: 'Kural güncellendi' })
    } catch (err: any) {
      toast({ title: 'Kural güncellenemedi', description: err.message, variant: 'destructive' })
    }
  }

  const addRule = async () => {
    if (conditionRows.some((condition) => !condition.field || !condition.value.trim()) || !actionTarget) {
      toast({ title: 'Kural bilgileri eksik', description: 'Tüm koşul alanları, değerleri ve aksiyon hedefi gereklidir', variant: 'destructive' })
      return
    }
    const nextRule = {
      name: ruleName.trim() || `Kural ${rules.length + 1}`,
      priority: rules.length + 1,
      conditions: { type: conditionType, conditions: conditionRows.map((condition) => ({ ...condition, value: condition.value.trim() })) },
      actions: [{ type: actionType, target: actionTarget }],
      enabled: true,
    }
    try {
      const created = await api<{ id: string }>(`/api/forms/${form.id}/logic`, { method: 'POST', body: JSON.stringify(nextRule) })
      const createdRule: LogicRule = { id: created.id, ...nextRule }
      setRules((current) => [...current, createdRule])
      setEnabledById((current) => ({ ...current, [createdRule.id]: true }))
      setRuleName('')
      setConditionRows([{ field: form.fields[0]?.fieldKey || '', operator: 'equals', value: '' }])
      setConditionType('all')
      setIsAdding(false)
      toast({ title: 'Kural eklendi' })
    } catch (err: any) {
      toast({ title: 'Kural eklenemedi', description: err.message, variant: 'destructive' })
    }
  }

  const runRuleTest = () => {
    const matches = rules
      .filter((rule) => enabledById[rule.id] ?? rule.enabled)
      .map((rule) => ({ rule, evaluation: evaluateLogicRule(rule, testValues) }))
      .filter(({ evaluation }) => evaluation.matched)
      .map(({ rule, evaluation }) => ({ rule, actions: evaluation.actions }))
    setTestResult(matches)
  }

  const testFields = Array.from(new Set(rules.flatMap((rule) => rule.conditions.conditions.map((condition) => condition.field))))

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-medium">Koşullu Mantık Kuralları</h3>
            <p className="text-xs text-muted-foreground">IF-THEN kuralları ile form davranışını otomatikleştirin</p>
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => setIsAdding((current) => !current)}>
            <Plus className="w-3.5 h-3.5" /> Kural Ekle
          </Button>
        </div>

        {(isAdding || editingRuleId !== null) && (
          <Card className="mb-4 border-primary/30 bg-muted/20 p-4 space-y-3">
            <h4 className="text-sm font-medium">{editingRuleId ? 'Kuralı düzenle' : 'Yeni kural'}</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Kural adı</Label>
                  <Input value={ruleName} onChange={(event) => setRuleName(event.target.value)} placeholder="Örn. Katılım yoksa alanı gizle" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Koşul bağlantısı</Label>
                  <select value={conditionType} onChange={(event) => setConditionType(event.target.value as 'all' | 'any')} className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm">
                    <option value="all">Tümü (VE)</option>
                    <option value="any">Herhangi biri (VEYA)</option>
                  </select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-xs">Koşullar</Label>
                  {conditionRows.map((condition, index) => (
                    <div key={index} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_150px_minmax(0,1fr)_auto]">
                      <select value={condition.field} onChange={(event) => setConditionRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, field: event.target.value } : row))} className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm" aria-label={`Koşul ${index + 1} alanı`}>
                        {form.fields.map((field) => <option key={field.id} value={field.fieldKey}>{field.label}</option>)}
                      </select>
                      <select value={condition.operator} onChange={(event) => setConditionRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, operator: event.target.value } : row))} className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm" aria-label={`Koşul ${index + 1} operatörü`}>
                        <option value="equals">eşittir</option>
                        <option value="not_equals">eşit değil</option>
                        <option value="contains">içerir</option>
                      </select>
                      <Input value={condition.value} onChange={(event) => setConditionRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, value: event.target.value } : row))} placeholder="Örnek değer" aria-label={`Koşul ${index + 1} değeri`} />
                      {conditionRows.length > 1 && <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive" onClick={() => setConditionRows((current) => current.filter((_, rowIndex) => rowIndex !== index))} aria-label={`Koşul ${index + 1} sil`}><Trash2 className="w-4 h-4" /></Button>}
                    </div>
                  ))}
                  <Button type="button" variant="ghost" size="sm" className="px-0" onClick={() => setConditionRows((current) => [...current, { field: form.fields[0]?.fieldKey || '', operator: 'equals', value: '' }])}>+ Koşul ekle</Button>
                </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Aksiyon</Label>
                <select value={actionType} onChange={(event) => setActionType(event.target.value as LogicRule['actions'][number]['type'])} className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm">
                  <option value="show">Göster</option>
                  <option value="hide">Gizle</option>
                  <option value="require">Zorunlu yap</option>
                  <option value="enable">Etkinleştir</option>
                  <option value="disable">Devre dışı bırak</option>
                </select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Aksiyon hedefi</Label>
                <select value={actionTarget} onChange={(event) => setActionTarget(event.target.value)} className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm">
                  {form.fields.map((field) => <option key={field.id} value={field.fieldKey}>{field.label}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => { setIsAdding(false); setEditingRuleId(null) }}>Vazgeç</Button>
              <Button type="button" size="sm" onClick={() => void (editingRuleId ? saveRuleEdit() : addRule())}>{editingRuleId ? 'Değişiklikleri kaydet' : 'Kuralı kaydet'}</Button>
            </div>
          </Card>
        )}

        <div className="space-y-3">
          {rules.map((rule) => (
            <Card key={rule.id} className="p-4 border-border/60">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">{rule.name || `Kural ${rule.priority}`}</span>
                  <Badge variant="outline" className="text-[10px]">Öncelik: {rule.priority}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  {editingRuleId !== rule.id && <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => startRuleEdit(rule)} aria-label={`${rule.name || `Kural ${rule.priority}`} kuralını düzenle`}><Pencil className="w-4 h-4" /></Button>}
                  <Switch checked={enabledById[rule.id] ?? rule.enabled} onCheckedChange={(enabled) => void toggleRule(rule.id, enabled)} disabled={savingId === rule.id} aria-label={`${rule.name || `Kural ${rule.priority}`} kuralını etkinleştir`} />
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => void deleteRule(rule)} aria-label={`${rule.name || `Kural ${rule.priority}`} kuralını sil`}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
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
          {rules.length === 0 && (
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
          <p className="text-xs text-muted-foreground">Örnek değerlerle etkin kuralların sonucunu kayıt oluşturmadan test edin</p>
          {testFields.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {testFields.map((fieldKey) => {
                const field = form.fields.find((candidate) => candidate.fieldKey === fieldKey)
                return (
                  <div key={fieldKey} className="space-y-1.5">
                    <Label className="text-xs">{field?.label || fieldKey}</Label>
                    <Input value={testValues[fieldKey] || ''} onChange={(event) => setTestValues((current) => ({ ...current, [fieldKey]: event.target.value }))} placeholder="Örnek değer" />
                  </div>
                )
              })}
            </div>
          )}
          <Button type="button" variant="outline" size="sm" onClick={runRuleTest}>Test Başlat</Button>
          {testResult && (
            <div className="rounded-md border border-border bg-background p-3 text-xs" role="status">
              {testResult.length === 0 ? 'Eşleşen etkin kural yok.' : testResult.map(({ rule, actions }) => (
                <div key={rule.id}>✓ {rule.name || `Kural ${rule.priority}`}: {actions.map((action) => `${action.type}${action.target ? ` → ${action.target}` : ''}`).join(', ')}</div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

function NotificationsPanel({ form }: { form: FormDetail }) {
  const { toast } = useToast()
  const [notifications, setNotifications] = useState<Notification[]>(form.notifications)
  const [enabledById, setEnabledById] = useState<Record<string, boolean>>(() => Object.fromEntries(form.notifications.map((notification) => [notification.id, notification.enabled])))
  const [savingId, setSavingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [editingNotificationId, setEditingNotificationId] = useState<string | null>(null)
  const [notificationName, setNotificationName] = useState('')
  const [notificationType, setNotificationType] = useState<Notification['type']>('admin')
  const [notificationTo, setNotificationTo] = useState('')
  const [notificationSubject, setNotificationSubject] = useState('Yeni Kayıt: {form_title}')
  const [notificationBody, setNotificationBody] = useState('')
  const [copiedTag, setCopiedTag] = useState<string | null>(null)
  const hasPublicEmailField = form.fields.some((field) => field.type === 'email' && !field.adminOnly && !field.hidden)

  useEffect(() => {
    setNotifications(form.notifications)
    setEnabledById(Object.fromEntries(form.notifications.map((notification) => [notification.id, notification.enabled])))
  }, [form.notifications])

  const toggleNotification = async (id: string, enabled: boolean) => {
    const previous = enabledById[id]
    setEnabledById((current) => ({ ...current, [id]: enabled }))
    setSavingId(id)
    try {
      await api(`/api/forms/${form.id}/notifications/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled }),
      })
      toast({ title: enabled ? 'Bildirim etkinleştirildi' : 'Bildirim duraklatıldı' })
    } catch (err: any) {
      setEnabledById((current) => ({ ...current, [id]: previous }))
      toast({ title: 'Bildirim güncellenemedi', description: err.message, variant: 'destructive' })
    } finally {
      setSavingId(null)
    }
  }

  const addNotification = async () => {
    if (notificationType === 'user_confirmation' && !hasPublicEmailField) {
      toast({ title: 'Kullanıcı onayı eklenemedi', description: 'Kullanıcı onayı için formda public bir e-posta alanı gerekir', variant: 'destructive' })
      return
    }
    if (!notificationName.trim() || (notificationType !== 'user_confirmation' && !notificationTo.trim())) {
      toast({ title: 'Bildirim bilgileri eksik', description: 'Ad ve alıcı alanları gereklidir', variant: 'destructive' })
      return
    }
    const config = { to: notificationTo.trim(), subject: notificationSubject.trim() || 'Yeni Kayıt: {form_title}', body: notificationBody.trim() }
    try {
      const created = await api<{ id: string }>(`/api/forms/${form.id}/notifications`, { method: 'POST', body: JSON.stringify({ name: notificationName.trim(), type: notificationType, enabled: true, config }) })
      const newNotification: Notification = { id: created.id, name: notificationName.trim(), type: notificationType, enabled: true, config }
      setNotifications((current) => [...current, newNotification])
      setEnabledById((current) => ({ ...current, [newNotification.id]: true }))
      setNotificationName('')
      setNotificationTo('')
      setNotificationSubject('Yeni Kayıt: {form_title}')
      setNotificationBody('')
      setIsAdding(false)
      toast({ title: 'Bildirim eklendi' })
    } catch (err: any) {
      toast({ title: 'Bildirim eklenemedi', description: err.message, variant: 'destructive' })
    }
  }

  const startNotificationEdit = (notification: Notification) => {
    setEditingNotificationId(notification.id)
    setIsAdding(false)
    setNotificationName(notification.name)
    setNotificationType(notification.type)
    setNotificationTo(notification.config.to || '')
    setNotificationSubject(notification.config.subject || '')
    setNotificationBody(notification.config.body || '')
  }

  const saveNotificationEdit = async () => {
    if (!editingNotificationId) return
    if (notificationType === 'user_confirmation' && !hasPublicEmailField) {
      toast({ title: 'Kullanıcı onayı güncellenemedi', description: 'Kullanıcı onayı için formda public bir e-posta alanı gerekir', variant: 'destructive' })
      return
    }
    if (!notificationName.trim() || (notificationType !== 'user_confirmation' && !notificationTo.trim())) {
      toast({ title: 'Bildirim bilgileri eksik', description: 'Ad ve alıcı alanları gereklidir', variant: 'destructive' })
      return
    }
    const config = { to: notificationTo.trim(), subject: notificationSubject.trim() || 'Yeni Kayıt: {form_title}', body: notificationBody.trim() }
    try {
      await api(`/api/forms/${form.id}/notifications/${editingNotificationId}`, { method: 'PATCH', body: JSON.stringify({ name: notificationName.trim(), type: notificationType, config }) })
      setNotifications((current) => current.map((notification) => notification.id === editingNotificationId ? { ...notification, name: notificationName.trim(), type: notificationType, config } : notification))
      setEditingNotificationId(null)
      toast({ title: 'Bildirim güncellendi' })
    } catch (err: any) {
      toast({ title: 'Bildirim güncellenemedi', description: err.message, variant: 'destructive' })
    }
  }

  const deleteNotification = async (notification: Notification) => {
    if (!confirm(`“${notification.name}” silinsin mi?`)) return
    try {
      await api(`/api/forms/${form.id}/notifications/${notification.id}`, { method: 'DELETE' })
      setNotifications((current) => current.filter((candidate) => candidate.id !== notification.id))
      setEnabledById((current) => {
        const next = { ...current }
        delete next[notification.id]
        return next
      })
      toast({ title: 'Bildirim silindi' })
    } catch (err: any) {
      toast({ title: 'Bildirim silinemedi', description: err.message, variant: 'destructive' })
    }
  }

  const copyMergeTag = async (tag: string) => {
    try {
      await navigator.clipboard.writeText(tag)
      setCopiedTag(tag)
      toast({ title: 'Merge Tag kopyalandı', description: tag })
      setTimeout(() => setCopiedTag((current) => current === tag ? null : current), 1500)
    } catch (err: any) {
      toast({ title: 'Merge Tag kopyalanamadı', description: err.message, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-medium">Bildirimler</h3>
            <p className="text-xs text-muted-foreground">E-posta ve webhook bildirimleri</p>
          </div>
          <Button type="button" size="sm" className="gap-1.5" onClick={() => setIsAdding((current) => !current)}>
            <Plus className="w-3.5 h-3.5" /> Bildirim Ekle
          </Button>
        </div>

        {(isAdding || editingNotificationId !== null) && (
          <Card className="mb-4 border-primary/30 bg-muted/20 p-4 space-y-3">
            <h4 className="text-sm font-medium">{editingNotificationId ? 'Bildirimi düzenle' : 'Yeni bildirim'}</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Bildirim adı</Label>
                <Input value={notificationName} onChange={(event) => setNotificationName(event.target.value)} placeholder="Örn. Yönetici e-postası" />
              </div>
              <div className="space-y-1.5">
                  <Label className="text-xs">Bildirim türü</Label>
                  <select value={notificationType} onChange={(event) => setNotificationType(event.target.value as Notification['type'])} className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm">
                    <option value="admin">Yönetici e-postası</option>
                    <option value="user_confirmation" disabled={!hasPublicEmailField}>Kullanıcı onayı</option>
                    <option value="webhook">Webhook</option>
                  </select>
                  {!hasPublicEmailField && <p className="text-[11px] text-muted-foreground">Kullanıcı onayı için formda public bir e-posta alanı gerekir.</p>}
              </div>
              {notificationType !== 'user_confirmation' && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Alıcı / webhook URL</Label>
                  <Input value={notificationTo} onChange={(event) => setNotificationTo(event.target.value)} placeholder="ornek@firma.com veya https://..." />
                </div>
              )}
              {notificationType !== 'webhook' && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="notification-template" className="text-xs">Hazır mesaj şablonu</Label>
                  <select
                    id="notification-template"
                    defaultValue=""
                    onChange={(event) => {
                      if (event.target.value === 'admin') {
                        setNotificationSubject('Yeni Kayıt: {form_title}')
                        setNotificationBody('Yeni bir form yanıtı alındı.\n{entry_data}')
                      }
                      if (event.target.value === 'participant') {
                        setNotificationSubject('Yanıtınız alınmıştır: {form_title}')
                        setNotificationBody('Form yanıtınız başarıyla alındı.')
                      }
                    }}
                    className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="">Şablon seçin</option>
                    {notificationType === 'admin' && <option value="admin">Yönetici: Yeni yanıt</option>}
                    {notificationType === 'user_confirmation' && <option value="participant">Katılımcı: Yanıtınız alındı</option>}
                  </select>
                  <p className="text-[11px] text-muted-foreground">Seçim konu ve gövde taslağını doldurur; kaydetmeden önce düzenleyebilirsiniz.</p>
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs">Konu</Label>
                <Input value={notificationSubject} onChange={(event) => setNotificationSubject(event.target.value)} placeholder="Yeni Kayıt: {form_title}" />
              </div>
              {notificationType !== 'webhook' && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">Bildirim gövdesi</Label>
                  <Textarea
                    value={notificationBody}
                    onChange={(event) => setNotificationBody(event.target.value)}
                    placeholder="Form yanıtınız başarıyla alındı."
                    rows={4}
                  />
                  <p className="text-[11px] text-muted-foreground">Boş bırakırsanız bildirim türünün güvenli varsayılan metni kullanılır. Desteklenen alanlar: {'{form_title}'} ve {'{entry_data}'}.</p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => { setIsAdding(false); setEditingNotificationId(null); setNotificationBody('') }}>Vazgeç</Button>
              <Button type="button" size="sm" onClick={() => void (editingNotificationId ? saveNotificationEdit() : addNotification())}>{editingNotificationId ? 'Değişiklikleri kaydet' : 'Bildirimi kaydet'}</Button>
            </div>
          </Card>
        )}

        <div className="space-y-3">
          {notifications.map((n) => (
            <Card key={n.id} className="p-4 border-border/60">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">{n.name}</span>
                  <Badge variant="outline" className="text-[10px]">{n.type}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => startNotificationEdit(n)} aria-label={`${n.name} bildirimini düzenle`}><Pencil className="w-4 h-4" /></Button>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => void deleteNotification(n)} aria-label={`${n.name} bildirimini sil`}><Trash2 className="w-4 h-4" /></Button>
                  <Switch checked={enabledById[n.id] ?? n.enabled} onCheckedChange={(enabled) => void toggleNotification(n.id, enabled)} disabled={savingId === n.id} aria-label={`${n.name} bildirimini etkinleştir`} />
                </div>
              </div>
              {n.config.subject && (
                <div className="text-xs text-muted-foreground">
                  Konu: <code className="bg-muted px-1 rounded">{n.config.subject}</code>
                </div>
              )}
            </Card>
          ))}
          {notifications.length === 0 && (
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
            <button key={tag} type="button" onClick={() => void copyMergeTag(tag)} className="text-left text-xs bg-muted px-2 py-1 rounded font-mono hover:bg-accent transition-colors" aria-label={`${tag} etiketini kopyala`}>
              {copiedTag === tag ? 'Kopyalandı' : tag}
            </button>
          ))}
        </div>
      </Card>
    </div>
  )
}

function PaymentPanel({ form }: { form: FormDetail }) {
  const paymentProviders = [
    { name: 'Stripe', desc: 'Kredi kartı ve global ödeme yöntemleri', status: 'planned', note: 'Sağlayıcı uygunluğu ve server bağlantısı bekleniyor' },
    { name: 'iyzico', desc: 'Türkiye kart ve 3DS ödemeleri', status: 'planned', note: 'Sağlayıcı sözleşmesi ve 3DS entegrasyonu bekleniyor' },
  ]

  return (
    <div className="space-y-6">
      <PaymentSecurityNotice />
      <PaymentConnectionWizard />

      <Card className="p-5">
        <div className="mb-4">
          <h3 className="font-medium">Ödeme Sağlayıcıları</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Ödeme entegrasyonları güvenlik ve sağlayıcı onayı tamamlandıktan sonra açılacaktır.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {paymentProviders.map((p) => (
            <Card key={p.name} className="p-4 flex items-center justify-between border-dashed">
              <div>
                <div className="text-sm font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.desc}</div>
                <div className="text-[11px] text-muted-foreground mt-1">{p.note}</div>
              </div>
              <Badge variant="outline">Planlandı</Badge>
            </Card>
          ))}
        </div>
      </Card>

      <Card className="p-5 space-y-3">
        <div>
          <h3 className="font-medium">Ödeme Ayarları</h3>
          <p className="text-xs text-muted-foreground mt-1">Önce doğrulanmış bir ödeme sağlayıcısı bağlanmalıdır.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Para Birimi</Label>
            <select disabled className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm">
              <option>TRY (₺)</option>
              <option>USD ($)</option>
              <option>EUR (€)</option>
              <option>GBP (£)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Vergi (%)</Label>
            <Input disabled type="number" defaultValue={18} placeholder="18" />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm">Test Modu</Label>
            <p className="text-xs text-muted-foreground">Sahte ödemeler</p>
          </div>
          <Switch disabled defaultChecked aria-label="Test modu henüz kullanılamıyor" />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm">Apple Pay / Google Pay</Label>
            <p className="text-xs text-muted-foreground">Mobil cüzdan desteği</p>
          </div>
          <Switch disabled aria-label="Google Pay ve Apple Pay henüz kullanılamıyor" />
        </div>
      </Card>
    </div>
  )
}

function IntegrationsPanel({ form }: { form: FormDetail }) {
  return (
    <div className="space-y-6">
      <IntegrationSecurityNotice />

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-medium">Entegrasyonlar</h3>
            <p className="text-xs text-muted-foreground">Üçüncü parti servislerle bağlantı</p>
          </div>
          <Button size="sm" variant="outline" className="gap-1.5" disabled aria-label="Entegrasyon kataloğu yakında" title="Entegrasyon kataloğu yakında">
            <Plus className="w-3.5 h-3.5" /> Katalog
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { name: 'Mailchimp', desc: 'E-posta pazarlama', status: 'planned' },
            { name: 'Slack', desc: 'Takım bildirimi', status: 'planned' },
            { name: 'Google Sheets', desc: 'Tabloya aktar', status: 'planned' },
            { name: 'Zapier', desc: 'Otomasyon', status: 'planned' },
            { name: 'HubSpot', desc: 'CRM', status: 'planned' },
            { name: 'Webhook', desc: 'Özel HTTP', status: 'planned' },
          ].map((p, i) => (
            <Card key={i} className="p-4 flex items-center justify-between border-dashed">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <Plug className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.desc}</div>
                </div>
              </div>
              <Badge variant="outline">
                Planlandı
              </Badge>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  )
}

function PaymentSecurityNotice() {
  return (
    <Alert className="border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/20">
      <ShieldCheck className="text-emerald-600" />
      <AlertTitle>Ödeme güvenliği kuralları</AlertTitle>
      <AlertDescription>
        <p>
          <strong className="font-bold text-foreground">Kart numarası, son kullanma tarihi ve CVV/CVC MavenForms sunucularında hiçbir şekilde tutulmaz.</strong>
          {' '}Kart alanları yalnızca doğrulanmış ödeme sağlayıcısının hosted checkout, iframe veya güvenli ödeme bileşeni üzerinden sunulur.
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">
          <li>Ödeme sonucu yalnızca sağlayıcı webhook imzası ve sunucu tarafı tutar, para birimi ve sipariş eşleşmesiyle kesinleştirilir; tarayıcı yönlendirmesi tek başına kanıt değildir.</li>
          <li>Secret/restricted anahtarlar yalnızca server-side secret storage veya environment üzerinden kullanılır; browser, embed, public API, log ve export içine girmez.</li>
          <li>Google Pay yalnızca sağlayıcı destekli gateway tokenization ile açılır. PCI doğrulaması olmadan Google Pay DIRECT token çözme uygulanmaz.</li>
          <li>Test ve canlı anahtarlar, webhook uçları ve sağlayıcı hesapları birbirinden ayrı tutulur; canlıya geçiş için HTTPS, sağlayıcı onayı ve release kontrolü gerekir.</li>
        </ul>
      </AlertDescription>
    </Alert>
  )
}

function IntegrationSecurityNotice() {
  return (
    <Alert className="border-sky-200 bg-sky-50/70 dark:border-sky-900 dark:bg-sky-950/20">
      <Info className="text-sky-600" />
      <AlertTitle>Entegrasyon güvenliği ve gerçek durum</AlertTitle>
      <AlertDescription>
        <p>
          <strong className="font-bold text-foreground">Entegrasyon secret’ları, webhook imzaları ve erişim token’ları yalnızca sunucuda tutulur; public form, embed kodu, browser state ve loglara aktarılmaz.</strong>
        </p>
        <p className="mt-2 text-xs">Bir servis ancak yetkili bağlantı, güvenli credential saklama ve gerçek sağlık kontrolü tamamlandığında “Bağlı” gösterilebilir. Henüz bu akışlar açılmadığı için kartlar bilinçli olarak “Planlandı” durumundadır.</p>
      </AlertDescription>
    </Alert>
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
