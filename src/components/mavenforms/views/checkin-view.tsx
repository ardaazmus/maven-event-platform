'use client'

import { useEffect, useState } from 'react'
import { useApp } from '@/lib/store'
import { api } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Loader2, ScanLine } from 'lucide-react'

type OccurrenceOption = { id: string; venue: string | null; hall: string | null; startsAt: string }
type FeedRow = {
  id: string
  credentialId: string
  direction: string
  gate: string | null
  deviceId: string | null
  operatorId: string | null
  occurredAt: string
}

export function CheckinView() {
  const { selectedEventId } = useApp()
  const [occurrences, setOccurrences] = useState<OccurrenceOption[] | null>(null)
  const [occurrenceId, setOccurrenceId] = useState<string>('')
  const [rows, setRows] = useState<FeedRow[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!selectedEventId) return
    let cancelled = false
    api<OccurrenceOption[]>(`/api/events/${encodeURIComponent(selectedEventId)}/occurrences`)
      .then((body) => {
        if (cancelled) return
        const list = Array.isArray(body) ? body : []
        setOccurrences(list)
        setOccurrenceId((previous) => (list.some((item) => item.id === previous) ? previous : ''))
      })
      .catch(() => {
        if (!cancelled) setOccurrences([])
      })
    return () => {
      cancelled = true
    }
  }, [selectedEventId])

  useEffect(() => {
    if (!occurrenceId) return
    let cancelled = false
    api<FeedRow[]>(`/api/checkin?occurrenceId=${encodeURIComponent(occurrenceId)}`)
      .then((body) => {
        if (!cancelled) setRows(Array.isArray(body) ? body : [])
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [occurrenceId])

  return (
    <div className="space-y-4 p-4 sm:p-6" data-testid="checkin-view">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold"><ScanLine className="h-5 w-5 text-primary" /> Check-in Akışı</h2>
        <p className="text-xs text-muted-foreground">Salt-okunur operatör akışı; tarama girişi ayrı adımdır.</p>
      </div>
      {!selectedEventId ? (
        <div className="p-6 text-sm text-muted-foreground">Önce etkinlik seçin — akış event bağlamı olmadan açılmaz.</div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label htmlFor="checkin-occurrence" className="font-medium">Oturum</label>
          <select
            id="checkin-occurrence"
            aria-label="Oturum seç"
            className="h-8 max-w-72 rounded-md border border-input bg-background px-2 text-sm"
            value={occurrenceId}
            onChange={(event) => setOccurrenceId(event.target.value)}
          >
            <option value="">Oturum seçin...</option>
            {(occurrences ?? []).map((item) => (
              <option key={item.id} value={item.id}>{item.hall || item.venue || item.id} · {new Date(item.startsAt).toLocaleString('tr-TR')}</option>
            ))}
          </select>
        </div>
      )}
      {selectedEventId && !occurrenceId && (
        <div className="p-6 text-sm text-muted-foreground">Akışı görmek için oturum seçin.</div>
      )}
      {selectedEventId && occurrenceId && rows === null && !failed && (
        <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Akış yükleniyor...</div>
      )}
      {selectedEventId && occurrenceId && (failed || rows === null) && (
        <div className="p-6 text-sm text-muted-foreground">Akış alınamadı; sayfayı yenileyin.</div>
      )}
      {selectedEventId && occurrenceId && rows !== null && !failed && rows.length === 0 && (
        <div className="p-6 text-sm text-muted-foreground">Bu oturumda tarama kaydı yok.</div>
      )}
      {selectedEventId && occurrenceId && rows !== null && !failed && rows.length > 0 && (
        <div className="grid gap-2">
          {rows.map((row) => (
            <Card key={row.id} className="flex flex-wrap items-center gap-2 p-3 text-sm">
              <Badge variant={row.direction === 'entry' ? 'default' : 'outline'} className="text-base">
                {row.direction === 'entry' ? 'Giriş' : 'Çıkış'}
              </Badge>
              <span className="text-xs text-muted-foreground">Kapı: {row.gate || '—'} · Cihaz: {row.deviceId || '—'} · {new Date(row.occurredAt).toLocaleString('tr-TR')}</span>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
