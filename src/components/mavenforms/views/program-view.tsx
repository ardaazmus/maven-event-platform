'use client'

import { useEffect, useState } from 'react'
import { useApp } from '@/lib/store'
import { api } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Mic } from 'lucide-react'

type ProgramSpeaker = {
  id: string
  fullName: string
  title: string | null
}

type ProgramRow = {
  id: string
  title: string
  startsAt: string
  endsAt: string
  room: string | null
  speakers: ProgramSpeaker[]
}

function formatRange(startsAt: string, endsAt: string) {
  const start = new Date(startsAt)
  const end = new Date(endsAt)
  const day = start.toLocaleDateString('tr-TR')
  const from = start.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  const to = end.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  return `${day} · ${from}–${to}`
}

export function ProgramView() {
  const { selectedEventId } = useApp()
  const [rows, setRows] = useState<ProgramRow[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [formTitle, setFormTitle] = useState('')
  const [formStartsAt, setFormStartsAt] = useState('')
  const [formEndsAt, setFormEndsAt] = useState('')
  const [formRoom, setFormRoom] = useState('')
  const [formBusy, setFormBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [speakerSessionId, setSpeakerSessionId] = useState<string | null>(null)
  const [speakerName, setSpeakerName] = useState('')
  const [speakerTitle, setSpeakerTitle] = useState('')
  const [speakerBusy, setSpeakerBusy] = useState(false)
  const [speakerError, setSpeakerError] = useState<string | null>(null)

  async function loadProgram(eventId: string) {
    const body = await api<ProgramRow[]>(`/api/events/${encodeURIComponent(eventId)}/program`)
    setRows(Array.isArray(body) ? body : [])
  }

  useEffect(() => {
    if (!selectedEventId) return
    let cancelled = false
    loadProgram(selectedEventId).catch(() => {
      if (!cancelled) setFailed(true)
    })
    return () => {
      cancelled = true
    }
  }, [selectedEventId])

  async function createSession() {
    if (!selectedEventId) return
    const title = formTitle.trim()
    if (!title) {
      setFormError('Oturum başlığı gerekli.')
      return
    }
    const startsAt = new Date(formStartsAt)
    const endsAt = new Date(formEndsAt)
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
      setFormError('Geçerli bir başlangıç-bitiş aralığı girin.')
      return
    }
    setFormBusy(true)
    setFormError(null)
    try {
      await api(`/api/events/${encodeURIComponent(selectedEventId)}/program`, {
        method: 'POST',
        body: JSON.stringify({ title, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), room: formRoom.trim() || null }),
      })
      setFormTitle('')
      setFormStartsAt('')
      setFormEndsAt('')
      setFormRoom('')
      setFailed(false)
      await loadProgram(selectedEventId)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Oturum oluşturulamadı.')
    } finally {
      setFormBusy(false)
    }
  }

  async function addSpeaker(sessionId: string) {
    if (!selectedEventId) return
    const fullName = speakerName.trim()
    if (!fullName) {
      setSpeakerError('Konuşmacı adı gerekli.')
      return
    }
    setSpeakerBusy(true)
    setSpeakerError(null)
    try {
      const created = await api<{ id: string }>(
        `/api/events/${encodeURIComponent(selectedEventId)}/program/speakers`,
        { method: 'POST', body: JSON.stringify({ fullName, title: speakerTitle.trim() || null }) },
      )
      await api(
        `/api/events/${encodeURIComponent(selectedEventId)}/program/sessions/${encodeURIComponent(sessionId)}/speakers`,
        { method: 'POST', body: JSON.stringify({ speakerId: created.id }) },
      )
      setSpeakerName('')
      setSpeakerTitle('')
      setSpeakerSessionId(null)
      await loadProgram(selectedEventId)
    } catch (error) {
      setSpeakerError(error instanceof Error ? error.message : 'Konuşmacı eklenemedi.')
    } finally {
      setSpeakerBusy(false)
    }
  }

  return (
    <div className="space-y-4 p-4 sm:p-6" data-testid="program-view">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold"><Mic className="h-5 w-5 text-primary" /> Program</h2>
        <p className="text-xs text-muted-foreground">Seçili etkinliğin oturum ve konuşmacıları; salt-okunur listedir, kayıt buradan yapılmaz.</p>
      </div>
      {selectedEventId ? (
        <div data-testid="program-create-form" className="flex flex-col gap-2 rounded-md border p-3">
          <div className="text-sm font-semibold">Yeni oturum</div>
          <input
            aria-label="Oturum başlığı"
            value={formTitle}
            onChange={(event) => setFormTitle(event.target.value)}
            placeholder="Oturum başlığı"
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              aria-label="Başlangıç"
              type="datetime-local"
              value={formStartsAt}
              onChange={(event) => setFormStartsAt(event.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
            <input
              aria-label="Bitiş"
              type="datetime-local"
              value={formEndsAt}
              onChange={(event) => setFormEndsAt(event.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
            <input
              aria-label="Salon"
              value={formRoom}
              onChange={(event) => setFormRoom(event.target.value)}
              placeholder="Salon (opsiyonel)"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={formBusy}
              onClick={createSession}
              className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              Oturum oluştur
            </button>
          </div>
          {formError ? <div role="alert" className="text-xs text-destructive">{formError}</div> : null}
        </div>
      ) : null}
      {!selectedEventId ? (
        <div className="p-6 text-sm text-muted-foreground">Önce etkinlik seçin — program event bağlamı olmadan listelenmez.</div>
      ) : rows === null && !failed ? (
        <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Mic className="h-4 w-4 animate-spin" /> Program yükleniyor...</div>
      ) : failed || rows === null ? (
        <div className="p-6 text-sm text-muted-foreground">Program alınamadı; sayfayı yenileyin.</div>
      ) : rows.length === 0 ? (
        <div className="p-6 text-sm text-muted-foreground">Bu etkinlikte program oturumu yok.</div>
      ) : (
        <div className="grid gap-3">
          {rows.map((row) => (
            <Card key={row.id} className="flex flex-col gap-1 p-4">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{row.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{formatRange(row.startsAt, row.endsAt)}{row.room ? ` · ${row.room}` : ''}</div>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {row.speakers.length === 0 ? (
                  <span className="text-xs text-muted-foreground">Konuşmacı atanmadı.</span>
                ) : (
                  row.speakers.map((speaker) => (
                    <Badge key={speaker.id} variant="outline">
                      {speaker.fullName}{speaker.title ? ` · ${speaker.title}` : ''}
                    </Badge>
                  ))
                )}
              </div>
              <div className="mt-1">
                <button
                  type="button"
                  onClick={() => { setSpeakerSessionId(speakerSessionId === row.id ? null : row.id); setSpeakerError(null) }}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Konuşmacı ekle
                </button>
                {speakerSessionId === row.id ? (
                  <div data-testid="program-speaker-form" className="mt-2 flex flex-col gap-2">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        aria-label="Konuşmacı adı"
                        value={speakerName}
                        onChange={(event) => setSpeakerName(event.target.value)}
                        placeholder="Ad Soyad"
                        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                      />
                      <input
                        aria-label="Konuşmacı unvanı"
                        value={speakerTitle}
                        onChange={(event) => setSpeakerTitle(event.target.value)}
                        placeholder="Unvan (opsiyonel)"
                        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                      />
                      <button
                        type="button"
                        disabled={speakerBusy}
                        onClick={() => addSpeaker(row.id)}
                        className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
                      >
                        Kaydet
                      </button>
                    </div>
                    {speakerError ? <div role="alert" className="text-xs text-destructive">{speakerError}</div> : null}
                  </div>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
