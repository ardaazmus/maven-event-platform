'use client'

import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
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
  Image as ImageIcon,
  EyeOff,
  ShieldCheck,
  GripVertical,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import type { FormField, FieldType } from '@/lib/types'

const fieldIcons: Record<FieldType, any> = {
  text: Type, paragraph: AlignLeft, email: Mail, phone: Phone, number: Hash,
  date: Calendar, time: Clock, checkbox: CheckSquare, radio: Circle,
  select: ChevronDown, dropdown: ChevronDown, file: FileUp, address: MapPin,
  signature: PenTool, rating: Star, price: DollarSign, matrix: Grid3x3,
  section: Minus, page_break: FileText, media: ImageIcon, hidden: EyeOff, captcha: ShieldCheck,
}

interface Props {
  fields: FormField[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onReorder: (id: string, direction: 'up' | 'down') => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onAddPlaceholder: () => void
  formTitle: string
  formDescription: string
  device: 'desktop' | 'tablet' | 'mobile'
}

function FieldPreview({ field }: { field: FormField }) {
  const config = field.config || {}
  const required = field.required ? ' *' : ''

  if (field.type === 'section') {
    return (
      <div className="py-2 border-t border-border">
        <h3 className="text-sm font-semibold text-foreground">{field.label}{required}</h3>
        {field.description && <p className="text-xs text-muted-foreground mt-1">{field.description}</p>}
      </div>
    )
  }

  if (field.type === 'page_break') {
    return (
      <div className="py-3 flex items-center gap-2">
        <div className="flex-1 border-t border-dashed border-border" />
        <FileText className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">{field.label}</span>
        <div className="flex-1 border-t border-dashed border-border" />
      </div>
    )
  }

  if (field.type === 'media') {
    return (
      <div className="space-y-1.5">
        {field.label && <Label className="text-xs">{field.label}</Label>}
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
          <ImageIcon className="w-6 h-6 text-muted-foreground mx-auto mb-2" aria-hidden="true" />
          <p className="text-xs text-muted-foreground">Medya alanı</p>
        </div>
      </div>
    )
  }

  if (field.type === 'hidden') {
    return (
      <div className="space-y-1.5">
        <Label className="text-xs flex items-center gap-1.5">
          <EyeOff className="w-3 h-3" /> {field.label} (Gizli)
        </Label>
        <Input disabled placeholder={field.defaultValue || 'Gizli değer'} className="text-xs font-mono opacity-50" />
      </div>
    )
  }

  if (field.type === 'captcha') {
    return (
      <div className="space-y-1.5">
        <Label className="text-xs flex items-center gap-1.5">
          <ShieldCheck className="w-3 h-3" /> {field.label}{required}
        </Label>
        <div className="rounded-lg border border-border bg-muted/30 p-4 flex items-center gap-3">
          <div className="w-6 h-6 rounded border-2 border-muted-foreground/30" />
          <span className="text-xs text-muted-foreground">Ben robot değilim</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium flex items-center gap-1">
        {field.label}{required}
        {field.encrypted && <ShieldCheck className="w-3 h-3 text-muted-foreground" />}
      </Label>
      {field.description && <p className="text-[10px] text-muted-foreground -mt-0.5">{field.description}</p>}
      
      {['text', 'email', 'phone', 'number', 'date', 'time'].includes(field.type) && (
        <Input
          disabled
          placeholder={field.placeholder || ''}
          defaultValue={field.defaultValue || ''}
          type={field.type === 'email' ? 'email' : field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'time' ? 'time' : 'text'}
          className="text-xs h-9"
        />
      )}

      {field.type === 'paragraph' && (
        <Textarea disabled placeholder={field.placeholder || ''} rows={3} className="text-xs" />
      )}

      {(field.type === 'radio' || field.type === 'checkbox') && (
        <div className="space-y-1.5">
          {(config.options || []).map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type={field.type === 'radio' ? 'radio' : 'checkbox'}
                disabled
                className="w-3.5 h-3.5"
              />
              <span className="text-xs">{opt.label}</span>
            </div>
          ))}
          {(config.options || []).length === 0 && (
            <p className="text-xs text-muted-foreground italic">Seçenek eklenmedi</p>
          )}
        </div>
      )}

      {field.type === 'select' && (
        <div className="relative">
          <select disabled className="w-full h-9 px-3 pr-8 text-xs rounded-md border border-input bg-muted/30">
            <option>{field.placeholder || 'Seçiniz...'}</option>
            {(config.options || []).map((opt, i) => (
              <option key={i}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        </div>
      )}

      {field.type === 'file' && (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center">
          <FileUp className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">
            {field.placeholder || 'Dosya yüklemek için tıklayın veya sürükleyin'}
          </p>
          {config.allowedTypes && (
            <p className="text-[10px] text-muted-foreground mt-1">
              İzin verilen: {(config.allowedTypes || []).join(', ')} · Max {config.maxSize || 5}MB
            </p>
          )}
        </div>
      )}

      {field.type === 'address' && (
        <div className="space-y-1.5">
          <Input disabled placeholder="Adres satırı 1" className="text-xs h-8" />
          <Input disabled placeholder="Adres satırı 2" className="text-xs h-8" />
          <div className="grid grid-cols-2 gap-1.5">
            <Input disabled placeholder="Şehir" className="text-xs h-8" />
            <Input disabled placeholder="Posta kodu" className="text-xs h-8" />
          </div>
        </div>
      )}

      {field.type === 'signature' && (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 h-20 flex items-center justify-center">
          <PenTool className="w-5 h-5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground ml-2">Buraya imza atın</span>
        </div>
      )}

      {field.type === 'rating' && (
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            {[...Array(config.max || 10)].map((_, i) => (
              <Star key={i} className="w-4 h-4 text-muted-foreground/40" />
            ))}
          </div>
          {config.lowLabel && config.highLabel && (
            <div className="flex justify-between w-full text-[10px] text-muted-foreground ml-2">
              <span>{config.lowLabel}</span>
              <span>{config.highLabel}</span>
            </div>
          )}
        </div>
      )}

      {field.type === 'price' && (
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input disabled placeholder="0.00" className="pl-8 text-xs h-9" />
        </div>
      )}

      {field.type === 'matrix' && (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="grid grid-cols-4 bg-muted/50 text-[10px] font-medium p-1.5">
            <div></div>
            <div className="text-center">Seçenek 1</div>
            <div className="text-center">Seçenek 2</div>
            <div className="text-center">Seçenek 3</div>
          </div>
          {[1, 2].map((r) => (
            <div key={r} className="grid grid-cols-4 p-1.5 border-t border-border text-[10px]">
              <div>Satır {r}</div>
              <div className="text-center"><input type="radio" disabled className="w-3 h-3" /></div>
              <div className="text-center"><input type="radio" disabled className="w-3 h-3" /></div>
              <div className="text-center"><input type="radio" disabled className="w-3 h-3" /></div>
            </div>
          ))}
        </div>
      )}

      {field.helpText && (
        <p className="text-[10px] text-muted-foreground">{field.helpText}</p>
      )}
    </div>
  )
}

export function BuilderCanvas({
  fields,
  selectedId,
  onSelect,
  onReorder,
  onDelete,
  onDuplicate,
  onAddPlaceholder,
  formTitle,
  formDescription,
  device,
}: Props) {
  const deviceWidth = device === 'mobile' ? 'max-w-[375px]' : device === 'tablet' ? 'max-w-[768px]' : 'max-w-3xl'

  return (
    <div className="flex-1 overflow-y-auto bg-muted/20 p-4 lg:p-8">
      <div className={cn('mx-auto bg-card rounded-xl border border-border shadow-sm overflow-hidden transition-all', deviceWidth)}>
        {/* Form header */}
        <div className="p-6 border-b border-border bg-gradient-to-br from-primary/5 to-transparent">
          <h2 className="text-xl font-bold tracking-tight">
            {formTitle || 'İsimsiz Form'}
          </h2>
          {formDescription && (
            <p className="text-sm text-muted-foreground mt-1.5">{formDescription}</p>
          )}
        </div>

        {/* Form fields */}
        <div className="p-6 space-y-4 min-h-[300px]">
          {fields.length === 0 ? (
            <button
              onClick={onAddPlaceholder}
              className="w-full min-h-[200px] rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all flex flex-col items-center justify-center text-muted-foreground hover:text-primary"
            >
              <Plus className="w-8 h-8 mb-2" />
              <p className="text-sm font-medium">İlk alanı ekleyin</p>
              <p className="text-xs mt-1">Soldaki paletten bir alan türü seçin</p>
            </button>
          ) : (
            fields.map((field, index) => {
              const Icon = fieldIcons[field.type] || Type
              const isSelected = selectedId === field.id
              return (
                <div
                  key={field.id}
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelect(field.id)
                  }}
                  className={cn(
                    'group relative rounded-lg border transition-all cursor-pointer',
                    isSelected
                      ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                      : 'border-transparent hover:border-border hover:bg-muted/30',
                    field.hidden && 'opacity-60'
                  )}
                >
                  {/* Field controls overlay */}
                  <div
                    className={cn(
                      'absolute -top-3 right-2 flex gap-0.5 opacity-0 transition-opacity',
                      (isSelected || true) && 'group-hover:opacity-100'
                    )}
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); onReorder(field.id, 'up') }}
                      disabled={index === 0}
                      className="w-6 h-6 rounded bg-background border border-border flex items-center justify-center hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Yukarı"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onReorder(field.id, 'down') }}
                      disabled={index === fields.length - 1}
                      className="w-6 h-6 rounded bg-background border border-border flex items-center justify-center hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Aşağı"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDuplicate(field.id) }}
                      className="w-6 h-6 rounded bg-background border border-border flex items-center justify-center hover:bg-accent"
                      title="Çoğalt"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(field.id) }}
                      className="w-6 h-6 rounded bg-background border border-border flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground"
                      title="Sil"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Drag handle */}
                  <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>

                  <div className="p-3">
                    <FieldPreview field={field} />
                  </div>

                  {/* Selected indicator */}
                  {isSelected && (
                    <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-primary" />
                  )}
                </div>
              )
            })
          )}

          {/* Add field placeholder at end */}
          {fields.length > 0 && (
            <button
              onClick={onAddPlaceholder}
              className="w-full py-3 rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2 text-muted-foreground hover:text-primary text-sm"
            >
              <Plus className="w-4 h-4" />
              Alan Ekle
            </button>
          )}

          {/* Submit button preview */}
          <div className="pt-4">
            <Button disabled className="w-full gap-2">
              Gönder
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
