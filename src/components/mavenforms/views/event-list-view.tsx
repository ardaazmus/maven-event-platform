'use client'

import { useEffect, useState } from 'react'
import { useApp } from '@/lib/store'
import { api } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CalendarDays, Check, Loader2, Plus } from 'lucide-react'

type EventRow = {
  id: string
  title: string
  description: string | null
  timezone: string
  status: string
  occurrenceCount: number
}

export function EventListView() {
  const { selectedEventId, selectEvent, setView } = useApp()
  const [rows, setRows] = useState<EventRow[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api<EventRow[]>('/api/events')
      .then((body) => {
        if (!cancelled) setRows(Array.isArray(body) ? body : [])
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    // Cross-view primary action: the caller navigates first, then this view
    // consumes the pending intent on mount. Same-view dispatch is the fast path.
    const openCreate = () => {
      setError(null)
      setFormOpen(true)
    }
    const handler = () => openCreate()
    window.addEventListener('mavenforms:new-event', handler)
    try {
      if (sessionStorage.getItem('mavenforms:new-event-pending') === '1') {
        sessionStorage.removeItem('mavenforms:new-event-pending')
        openCreate()
      }
    } catch {}
    return () => window.removeEventListener('mavenforms:new-event', handler)
  }, [])

  const handleCreate = async () => {
    const name = title.trim()
    if (!name) {
      setError('Etkinlik adı gerekli.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const created = await api<{ id: string; title: string }>('/api/events', {
        method: 'POST',
        body: JSON.stringify({ title: name, description: description.trim() || null }),
      })
      const refreshed = await api<EventRow[]>('/api/events')
      if (Array.isArray(refreshed)) setRows(refreshed)
      setTitle('')
      setDescription('')
      setFormOpen(false)
      selectEvent(created.id)
      setView('event-dashboard')
    } catch (err: any) {
      setError(err?.message || 'Etkinlik oluşturulamadı.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 p-4 sm:p-6" data-testid="event-list">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold"><CalendarDays className="h-5 w-5 text-primary" /> Etkinlikler</h2>
          <p className="text-xs text-muted-foreground">Bağlam seçmek için bir etkinlik seçin; check-in, yaka kartı ve floor işlemleri seçili etkinlikte çalışır.</p>
        </div>
        <Button type="button" size="sm" onClick={() => { setError(null); setFormOpen(true) }} aria-label="Yeni Etkinlik oluştur">
          <Plus className="h-3.5 w-3.5" /> Yeni Etkinlik
        </Button>
      </div>
      {formOpen ? (
        <Card className="space-y-3 p-4" data-testid="event-create-form">
          <div className="space-y-1">
            <label htmlFor="event-create-title" className="text-xs font-medium">Etkinlik adı</label>
            <input
              id="event-create-title"
              type="text"
              required
              maxLength={200}
              autoFocus
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') handleCreate() }}
              placeholder="Örn. 2026 Yaz Konferansı"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="event-create-description" className="text-xs font-medium">Açıklama (opsiyonel)</label>
            <textarea
              id="event-create-description"
              rows={2}
              maxLength={2000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Kısa açıklama"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="outline" disabled={saving} onClick={() => { setError(null); setFormOpen(false) }}>
              Vazgeç
            </Button>
            <Button type="button" size="sm" disabled={saving || !title.trim()} onClick={handleCreate} aria-label="Etkinliği oluştur">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} {saving ? 'Oluşturuluyor...' : 'Oluştur'}
            </Button>
          </div>
        </Card>
      ) : null}
      {rows === null && !failed ? (
        <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Etkinlikler yükleniyor...</div>
      ) : failed || rows === null ? (
        <div className="p-6 text-sm text-muted-foreground">Etkinlik listesi alınamadı; sayfayı yenileyin.</div>
      ) : rows.length === 0 ? (
        <div className="space-y-3 p-6 text-sm text-muted-foreground">
          <p>Henüz etkinlik yok. İlk etkinliği oluşturun.</p>
          <Button type="button" size="sm" onClick={() => { setError(null); setFormOpen(true) }} aria-label="İlk etkinliği oluştur">
            <Plus className="h-3.5 w-3.5" /> Yeni Etkinlik
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {rows.map((row) => {
            const active = row.id === selectedEventId
            return (
              <Card key={row.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    <span className="truncate">{row.title}</span>
                    <Badge variant="outline">{row.status}</Badge>
                    {active && <Badge>Seçili bağlam</Badge>}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{row.timezone} · {row.occurrenceCount} occurrence</div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={active ? 'secondary' : 'outline'}
                  disabled={active}
                  onClick={() => { selectEvent(row.id); setView('event-dashboard') }}
                  aria-label={active ? `${row.title} seçili` : `${row.title} etkinliğini seç`}
                >
                  {active ? <Check className="h-3.5 w-3.5" /> : null} {active ? 'Seçili' : 'Seç'}
                </Button>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
