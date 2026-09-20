'use client'

import { useEffect, useState } from 'react'
import { useApp } from '@/lib/store'
import { api } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, Loader2 } from 'lucide-react'

type EventOption = { id: string; title: string; status: string }

export function EventBar() {
  const { selectedEventId, selectEvent, setView } = useApp()
  const [options, setOptions] = useState<EventOption[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    api<EventOption[]>('/api/events')
      .then((body) => {
        if (!cancelled) setOptions(Array.isArray(body) ? body : [])
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const selected = options?.find((option) => option.id === selectedEventId) ?? null

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/30 px-4 py-2 text-sm" data-testid="event-bar">
      <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      <label htmlFor="event-bar-select" className="font-medium">Etkinlik</label>
      {options === null && !failed ? (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Etkinlikler yükleniyor...</span>
      ) : failed || options === null ? (
        <span className="text-xs text-muted-foreground">Etkinlik listesi alınamadı; sayfayı yenileyin.</span>
      ) : (
        <select
          id="event-bar-select"
          aria-label="Etkinlik seç"
          className="h-8 max-w-64 rounded-md border border-input bg-background px-2 text-sm"
          value={selectedEventId ?? ''}
          onChange={(event) => selectEvent(event.target.value || null)}
        >
          <option value="">Etkinlik seçin...</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>{option.title}</option>
          ))}
        </select>
      )}
      {selected ? (
        <Badge variant="outline">{selected.title} · {selected.status}</Badge>
      ) : (
        <>
        <span className="text-xs text-muted-foreground">Etkinlik seçilmedi — check-in, yaka kartı ve floor işlemleri için önce etkinlik seçin.</span>
        <button type="button" aria-label="Yeni Etkinlik oluştur" onClick={() => setView('events')} className="h-7 rounded-md border border-input bg-background px-2 text-xs font-medium hover:bg-accent">Yeni Etkinlik</button>
        </>
      )}
    </div>
  )
}
