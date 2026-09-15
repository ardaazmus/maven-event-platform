'use client'

import { useMemo, useState } from 'react'
import { Check, ChevronDown, ChevronUp, Search, X } from 'lucide-react'
import { iconCatalog } from '@/lib/icon-registry'

interface IconPickerProps {
  value?: string
  onChange: (iconName: string | null) => void
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('tr-TR')
    if (!normalized) return iconCatalog
    return iconCatalog.filter((item) => `${item.label} ${item.keywords}`.toLocaleLowerCase('tr-TR').includes(normalized))
  }, [query])
  const selectedItem = iconCatalog.find((item) => item.id === value)

  if (!open) {
    return (
      <div className="rounded-lg border border-border/70 bg-muted/20 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {selectedItem ? (
              <>
                <selectedItem.Icon className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.8} />
                <span className="truncate text-xs font-medium">{selectedItem.label}</span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">Icon seçilmedi</span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {value && (
              <button type="button" onClick={() => onChange(null)} aria-label="Icon seçimini kaldır" className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <button type="button" onClick={() => setOpen(true)} aria-expanded={false} aria-controls="icon-library-panel" className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-medium transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              Icon göster
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div id="icon-library-panel" className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-foreground">Icon kütüphanesi</span>
        <button type="button" onClick={() => setOpen(false)} aria-expanded={true} aria-controls="icon-library-panel" className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background px-2 text-[10px] font-medium transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          Icon gizle
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            aria-label="Icon kütüphanesinde ara"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Icon kütüphanesinde ara"
            className="h-8 w-full rounded-md border border-border bg-background pl-7 pr-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
        {value && (
          <button type="button" onClick={() => onChange(null)} aria-label="Icon seçimini kaldır" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="grid max-h-52 grid-cols-4 gap-1.5 overflow-y-auto sm:grid-cols-5" role="listbox" aria-label="Icon seçenekleri">
        {filtered.map(({ id, label, Icon }) => {
          const selected = value === id
          return (
            <button
              key={id}
              type="button"
              role="option"
              aria-selected={selected}
              aria-label={label}
              title={label}
              onClick={() => onChange(id)}
              className={`relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-md border p-1 text-[10px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${selected ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/40' : 'border-border bg-background hover:border-primary/50 hover:bg-primary/5'}`}
            >
              <Icon className="h-4 w-4" strokeWidth={1.8} />
              <span className="max-w-full truncate">{label}</span>
              {selected && <Check className="absolute right-1 top-1 h-3 w-3" />}
            </button>
          )
        })}
        {filtered.length === 0 && <p className="col-span-full py-4 text-center text-xs text-muted-foreground">Icon bulunamadı.</p>}
      </div>
      <p className="text-[10px] text-muted-foreground">Lucide SVG kütüphanesi · {iconCatalog.length} icon · ağ bağlantısı gerektirmez.</p>
    </div>
  )
}
