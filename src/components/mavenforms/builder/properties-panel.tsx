'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Type,
  AlignLeft,
  Mail,
  Phone,
  Hash,
  Calendar,
  Clock,
  CheckSquare,
  Circle,
  ChevronDown,
  FileUp,
  MapPin,
  PenTool,
  Star,
  DollarSign,
  Grid3x3,
  Minus,
  FileText,
  Image,
  EyeOff,
  ShieldCheck,
  Plus,
  Trash2,
  GripVertical,
  Settings2,
  ToggleLeft,
  Eye,
  Copy,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import type { FormField, FieldType, FieldConfig } from '@/lib/types'

const fieldIcons: Record<FieldType, any> = {
  text: Type,
  paragraph: AlignLeft,
  email: Mail,
  phone: Phone,
  number: Hash,
  date: Calendar,
  time: Clock,
  checkbox: CheckSquare,
  radio: Circle,
  select: ChevronDown,
  dropdown: ChevronDown,
  file: FileUp,
  address: MapPin,
  signature: PenTool,
  rating: Star,
  price: DollarSign,
  matrix: Grid3x3,
  section: Minus,
  page_break: FileText,
  media: Image,
  hidden: EyeOff,
  captcha: ShieldCheck,
}

const fieldLabels: Record<FieldType, string> = {
  text: 'Kısa Metin',
  paragraph: 'Uzun Metin',
  email: 'E-posta',
  phone: 'Telefon',
  number: 'Sayı',
  date: 'Tarih',
  time: 'Saat',
  checkbox: 'Onay Kutusu',
  radio: 'Çoktan Seçmeli',
  select: 'Açılır Liste',
  dropdown: 'Açılır Liste',
  file: 'Dosya Yükleme',
  address: 'Adres',
  signature: 'İmza',
  rating: 'Değerlendirme',
  price: 'Fiyat',
  matrix: 'Matris',
  section: 'Bölüm',
  page_break: 'Sayfa Sonu',
  media: 'Medya',
  hidden: 'Gizli Alan',
  captcha: 'Captcha',
}

interface Props {
  field: FormField | null
  onUpdate: (id: string, updates: Partial<FormField>) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
}

export function PropertiesPanel({
  field,
  onUpdate,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
}: Props) {
  const [tab, setTab] = useState('general')

  if (!field) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
          <Settings2 className="w-6 h-6 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-medium mb-1">Alan seçilmedi</h3>
        <p className="text-xs text-muted-foreground">
          Düzenlemek için canvas'tan bir alan seçin
        </p>
      </div>
    )
  }

  const Icon = fieldIcons[field.type] || Type
  const isLayoutField = ['section', 'page_break', 'media'].includes(field.type)
  const hasOptions = ['select', 'radio', 'checkbox', 'dropdown'].includes(field.type)
  const hasValidation = ['text', 'paragraph', 'email', 'phone', 'number', 'date'].includes(field.type)

  const updateConfig = (key: string, value: any) => {
    const newConfig = { ...field.config, [key]: value }
    onUpdate(field.id, { config: newConfig })
  }

  const addOption = () => {
    const options = [...(field.config.options || []), { label: `Seçenek ${(field.config.options?.length || 0) + 1}`, value: `opt_${Date.now()}` }]
    updateConfig('options', options)
  }

  const updateOption = (i: number, key: 'label' | 'value', val: string) => {
    const options = [...(field.config.options || [])]
    options[i] = { ...options[i], [key]: val }
    updateConfig('options', options)
  }

  const removeOption = (i: number) => {
    const options = (field.config.options || []).filter((_, idx) => idx !== i)
    updateConfig('options', options)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{field.label || 'İsimsiz Alan'}</div>
            <div className="text-[10px] text-muted-foreground">
              {fieldLabels[field.type]} · {field.fieldKey}
            </div>
          </div>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => onMoveUp(field.id)} title="Yukarı">
            <ArrowUp className="w-3 h-3" />
          </Button>
          <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => onMoveDown(field.id)} title="Aşağı">
            <ArrowDown className="w-3 h-3" />
          </Button>
          <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => onDuplicate(field.id)} title="Çoğalt">
            <Copy className="w-3 h-3" />
          </Button>
          <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => onDelete(field.id)} title="Sil">
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="px-3 pt-2 border-b border-border">
          <TabsList className="grid w-full grid-cols-3 h-9">
            <TabsTrigger value="general" className="text-xs gap-1">
              <Type className="w-3 h-3" /> Genel
            </TabsTrigger>
            <TabsTrigger value="validation" className="text-xs gap-1" disabled={!hasValidation && !hasOptions}>
              <ShieldCheck className="w-3 h-3" /> Doğrulama
            </TabsTrigger>
            <TabsTrigger value="advanced" className="text-xs gap-1">
              <ToggleLeft className="w-3 h-3" /> Gelişmiş
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4">
            <TabsContent value="general" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label className="text-xs">Etiket (Label) *</Label>
                <Input
                  value={field.label}
                  onChange={(e) => onUpdate(field.id, { label: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Açıklama</Label>
                <Textarea
                  value={field.description || ''}
                  onChange={(e) => onUpdate(field.id, { description: e.target.value })}
                  className="text-sm min-h-[60px]"
                  placeholder="Alan altında görünecek açıklama..."
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Placeholder</Label>
                <Input
                  value={field.placeholder || ''}
                  onChange={(e) => onUpdate(field.id, { placeholder: e.target.value })}
                  className="h-8 text-sm"
                  placeholder="örn. Adınızı girin"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Yardım Metni</Label>
                <Input
                  value={field.helpText || ''}
                  onChange={(e) => onUpdate(field.id, { helpText: e.target.value })}
                  className="h-8 text-sm"
                  placeholder="İpucu metni..."
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Field Key</Label>
                <Input
                  value={field.fieldKey}
                  onChange={(e) => onUpdate(field.id, { fieldKey: e.target.value.replace(/[^a-z0-9_]/gi, '_').toLowerCase() })}
                  className="h-8 text-sm font-mono"
                />
              </div>

              {hasOptions && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Seçenekler</Label>
                      <Button size="sm" variant="ghost" className="h-6 text-xs gap-1" onClick={addOption}>
                        <Plus className="w-3 h-3" /> Ekle
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {(field.config.options || []).map((opt, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <GripVertical className="w-3 h-3 text-muted-foreground shrink-0" />
                          <Input
                            value={opt.label}
                            onChange={(e) => updateOption(i, 'label', e.target.value)}
                            className="h-7 text-xs flex-1"
                            placeholder={`Seçenek ${i + 1}`}
                          />
                          <Input
                            value={opt.value}
                            onChange={(e) => updateOption(i, 'value', e.target.value)}
                            className="h-7 text-xs w-24 font-mono"
                            placeholder="value"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive shrink-0"
                            onClick={() => removeOption(i)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {field.type === 'rating' && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Max Değer</Label>
                      <Input
                        type="number"
                        value={field.config.max || 10}
                        onChange={(e) => updateConfig('max', parseInt(e.target.value) || 10)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Stil</Label>
                      <select
                        value={field.config.style || 'star'}
                        onChange={(e) => updateConfig('style', e.target.value)}
                        className="w-full h-8 px-2 rounded-md border border-input bg-background text-sm"
                      >
                        <option value="star">Yıldız</option>
                        <option value="heart">Kalp</option>
                        <option value="number">Sayı</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Düşük Etiket</Label>
                      <Input
                        value={field.config.lowLabel || ''}
                        onChange={(e) => updateConfig('lowLabel', e.target.value)}
                        className="h-8 text-sm"
                        placeholder="Kötü"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Yüksek Etiket</Label>
                      <Input
                        value={field.config.highLabel || ''}
                        onChange={(e) => updateConfig('highLabel', e.target.value)}
                        className="h-8 text-sm"
                        placeholder="Mükemmel"
                      />
                    </div>
                  </div>
                </>
              )}

              {field.type === 'number' && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Min</Label>
                      <Input
                        type="number"
                        value={field.config.min ?? ''}
                        onChange={(e) => updateConfig('min', e.target.value ? parseInt(e.target.value) : undefined)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Max</Label>
                      <Input
                        type="number"
                        value={field.config.max ?? ''}
                        onChange={(e) => updateConfig('max', e.target.value ? parseInt(e.target.value) : undefined)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </>
              )}

              {field.type === 'file' && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-xs">İzin Verilen Türler</Label>
                    <Input
                      value={(field.config.allowedTypes || []).join(', ')}
                      onChange={(e) => updateConfig('allowedTypes', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
                      className="h-8 text-sm"
                      placeholder="pdf, jpg, png"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Max Boyut (MB)</Label>
                    <Input
                      type="number"
                      value={field.config.maxSize || 5}
                      onChange={(e) => updateConfig('maxSize', parseInt(e.target.value) || 5)}
                      className="h-8 text-sm"
                    />
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="validation" className="space-y-4 mt-0">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Zorunlu</Label>
                  <p className="text-[10px] text-muted-foreground">Kullanıcı boş bırakamaz</p>
                </div>
                <Switch checked={field.required} onCheckedChange={(c) => onUpdate(field.id, { required: c })} />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Benzersiz</Label>
                  <p className="text-[10px] text-muted-foreground">Aynı değer tekrarlanamaz</p>
                </div>
                <Switch checked={field.unique} onCheckedChange={(c) => onUpdate(field.id, { unique: c })} />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Salt Okunur</Label>
                  <p className="text-[10px] text-muted-foreground">Değiştirilemez</p>
                </div>
                <Switch checked={field.readOnly} onCheckedChange={(c) => onUpdate(field.id, { readOnly: c })} />
              </div>

              {(field.type === 'text' || field.type === 'paragraph') && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-xs">Max Uzunluk</Label>
                    <Input
                      type="number"
                      value={field.config.maxLength ?? ''}
                      onChange={(e) => updateConfig('maxLength', e.target.value ? parseInt(e.target.value) : undefined)}
                      className="h-8 text-sm"
                      placeholder="Sınırsız"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Regex Pattern</Label>
                    <Input
                      value={field.config.pattern || ''}
                      onChange={(e) => updateConfig('pattern', e.target.value)}
                      className="h-8 text-sm font-mono"
                      placeholder="^[A-Za-z0-9]+$"
                    />
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4 mt-0">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Gizli</Label>
                  <p className="text-[10px] text-muted-foreground">Formda görünmez</p>
                </div>
                <Switch checked={field.hidden} onCheckedChange={(c) => onUpdate(field.id, { hidden: c })} />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Admin Only</Label>
                  <p className="text-[10px] text-muted-foreground">Yalnız admin panelinde</p>
                </div>
                <Switch checked={field.adminOnly} onCheckedChange={(c) => onUpdate(field.id, { adminOnly: c })} />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Şifreli</Label>
                  <p className="text-[10px] text-muted-foreground">Veri şifrelenir</p>
                </div>
                <Switch checked={field.encrypted} onCheckedChange={(c) => onUpdate(field.id, { encrypted: c })} />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-xs">Varsayılan Değer</Label>
                <Input
                  value={field.defaultValue || ''}
                  onChange={(e) => onUpdate(field.id, { defaultValue: e.target.value })}
                  className="h-8 text-sm"
                  placeholder="Önceden doldurulacak değer"
                />
              </div>

              <Separator />

              <div className="rounded-lg bg-muted/50 p-3 text-[10px] text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Field ID:</span>
                  <code className="text-foreground">{field.id}</code>
                </div>
                <div className="flex justify-between">
                  <span>Field Key:</span>
                  <code className="text-foreground">{field.fieldKey}</code>
                </div>
                <div className="flex justify-between">
                  <span>Type:</span>
                  <code className="text-foreground">{field.type}</code>
                </div>
                <div className="flex justify-between">
                  <span>Sort Order:</span>
                  <code className="text-foreground">{field.sortOrder}</code>
                </div>
              </div>
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  )
}
