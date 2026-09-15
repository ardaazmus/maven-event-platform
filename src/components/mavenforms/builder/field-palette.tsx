'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
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
  Search,
  Layout,
  ChevronRight,
} from 'lucide-react'
import type { FieldType } from '@/lib/types'

interface FieldDef {
  type: FieldType
  label: string
  icon: any
  description: string
  category: 'basic' | 'choice' | 'advanced' | 'layout' | 'special'
}

const fieldDefs: FieldDef[] = [
  // Basic
  { type: 'text', label: 'Kısa Metin', icon: Type, description: 'Tek satır metin', category: 'basic' },
  { type: 'paragraph', label: 'Uzun Metin', icon: AlignLeft, description: 'Çok satırlı metin', category: 'basic' },
  { type: 'email', label: 'E-posta', icon: Mail, description: 'E-posta adresi', category: 'basic' },
  { type: 'phone', label: 'Telefon', icon: Phone, description: 'Telefon numarası', category: 'basic' },
  { type: 'number', label: 'Sayı', icon: Hash, description: 'Sayısal değer', category: 'basic' },
  { type: 'date', label: 'Tarih', icon: Calendar, description: 'Tarih seçici', category: 'basic' },
  { type: 'time', label: 'Saat', icon: Clock, description: 'Saat seçici', category: 'basic' },
  // Choice
  { type: 'radio', label: 'Çoktan Seçmeli', icon: Circle, description: 'Tek seçim', category: 'choice' },
  { type: 'checkbox', label: 'Onay Kutusu', icon: CheckSquare, description: 'Çoklu seçim', category: 'choice' },
  { type: 'select', label: 'Açılır Liste', icon: ChevronDown, description: 'Dropdown seçim', category: 'choice' },
  // Advanced
  { type: 'file', label: 'Dosya Yükleme', icon: FileUp, description: 'Dosya yükletme', category: 'advanced' },
  { type: 'address', label: 'Adres', icon: MapPin, description: 'Adres alanları', category: 'advanced' },
  { type: 'signature', label: 'İmza', icon: PenTool, description: 'El imzası', category: 'advanced' },
  { type: 'rating', label: 'Değerlendirme', icon: Star, description: 'Yıldız puanı', category: 'advanced' },
  { type: 'price', label: 'Fiyat', icon: DollarSign, description: 'Ödeme tutarı', category: 'advanced' },
  { type: 'matrix', label: 'Matris', icon: Grid3x3, description: 'Tablo seçimi', category: 'advanced' },
  // Layout
  { type: 'section', label: 'Bölüm', icon: Minus, description: 'Görsel ayraç', category: 'layout' },
  { type: 'page_break', label: 'Sayfa Sonu', icon: FileText, description: 'Çoklu sayfa', category: 'layout' },
  { type: 'media', label: 'Medya', icon: Image, description: 'Resim/video', category: 'layout' },
  // Special
  { type: 'hidden', label: 'Gizli Alan', icon: EyeOff, description: 'Görünmez değer', category: 'special' },
  { type: 'captcha', label: 'Captcha', icon: ShieldCheck, description: 'Spam koruması', category: 'special' },
]

const categoryLabels: Record<string, string> = {
  basic: 'Temel Alanlar',
  choice: 'Seçim Alanları',
  advanced: 'Gelişmiş',
  layout: 'Düzen',
  special: 'Özel',
}

const categoryOrder = ['basic', 'choice', 'advanced', 'layout', 'special']

interface Props {
  onAdd: (type: FieldType) => void
  fieldCount: number
  onApplyLayout: (presetId: string) => void
}

const layoutPresets = [
  { id: 'grid-single', label: 'Tek kolon', description: '12/12', group: 'Grid' },
  { id: 'grid-equal', label: 'İki eşit', description: '6 + 6', group: 'Grid' },
  { id: 'grid-thirds', label: 'Ana + yan', description: '4 + 8', group: 'Grid' },
  { id: 'grid-quarters', label: 'Dört eşit', description: '3 + 3 + 3 + 3', group: 'Grid' },
  { id: 'bento-featured', label: 'Öne çıkan', description: '8 + 4 + 4', group: 'Bento' },
  { id: 'bento-focus', label: 'Odak düzeni', description: '7 + 5 + 5', group: 'Bento' },
]

export function FieldPalette({ onAdd, fieldCount, onApplyLayout }: Props) {
  const [search, setSearch] = useState('')
  const [openCats, setOpenCats] = useState<Set<string>>(new Set(['basic', 'choice']))
  const [layoutGuideOpen, setLayoutGuideOpen] = useState(false)

  const filtered = fieldDefs.filter(
    (f) =>
      f.label.toLowerCase().includes(search.toLowerCase()) ||
      f.description.toLowerCase().includes(search.toLowerCase())
  )

  const grouped = categoryOrder
    .map((cat) => ({
      cat,
      fields: filtered.filter((f) => f.category === cat),
    }))
    .filter((g) => g.fields.length > 0)

  const toggleCat = (cat: string) => {
    setOpenCats((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Alan ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      <div className="border-b border-border p-3">
        <Collapsible open={layoutGuideOpen} onOpenChange={setLayoutGuideOpen}>
          <CollapsibleTrigger className="w-full rounded-md text-left transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <div className="flex items-center justify-between gap-2 px-1 py-1">
              <div className="flex min-w-0 items-center gap-2">
                <Layout className="h-3.5 w-3.5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold">Responsive düzen</div>
                  <div className="truncate text-[10px] text-muted-foreground">
                    {fieldCount} alan · alan seçince sağ panelden ayarla
                  </div>
                </div>
              </div>
              <ChevronRight
                className={cn('h-3.5 w-3.5 shrink-0 transition-transform', layoutGuideOpen && 'rotate-90')}
              />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="rounded-lg border border-border/80 bg-muted/20 p-2">
              <div className="mb-2 text-[10px] leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">Yerleşim sihirbazı</span> yalnızca hızlı başlangıç içindir.
                Kesin genişliği canvas&apos;ta alanı seçip sağdaki Desktop/Tablet kaydırıcısından belirleyin.
              </div>
              <div className="space-y-2">
                {(['Grid', 'Bento'] as const).map((group) => (
                  <div key={group} className="space-y-1">
                    <div className="px-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{group}</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {layoutPresets.filter((preset) => preset.group === group).map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          disabled={fieldCount === 0}
                          onClick={() => onApplyLayout(preset.id)}
                          className="min-w-0 rounded-md border border-border bg-background px-2 py-1.5 text-left transition-colors hover:border-primary/60 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                          title={`${preset.group}: ${preset.description}`}
                        >
                          <span className="block truncate text-[11px] font-medium">{preset.label}</span>
                          <span className="block truncate text-[9px] text-muted-foreground">{preset.description}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {grouped.map(({ cat, fields }) => (
          <Collapsible key={cat} open={openCats.has(cat)} onOpenChange={() => toggleCat(cat)}>
            <CollapsibleTrigger className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
              <span>{categoryLabels[cat]}</span>
              <ChevronRight
                className={cn('w-3 h-3 transition-transform', openCats.has(cat) && 'rotate-90')}
              />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-1 pb-2">
                {fields.map((f) => (
                  <button
                    key={f.type}
                    type="button"
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData('application/x-mavenforms-field', f.type)
                      event.dataTransfer.effectAllowed = 'copy'
                    }}
                    onClick={() => onAdd(f.type)}
                    className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm hover:bg-accent hover:text-accent-foreground transition-colors group text-left"
                    title={f.description}
                  >
                    <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors shrink-0">
                      <f.icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium leading-tight">{f.label}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{f.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>

      <div className="p-3 border-t border-border bg-muted/30">
        <div className="text-[10px] text-muted-foreground leading-relaxed">
          <Layout className="w-3 h-3 inline mr-1" />
          Sürükle-bırak veya tıkla ile alan ekle
        </div>
      </div>
    </div>
  )
}
