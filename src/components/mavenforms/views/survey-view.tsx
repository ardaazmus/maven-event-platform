'use client'

import { useEffect, useState } from 'react'
import { useApp } from '@/lib/store'
import { api } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ClipboardList } from 'lucide-react'

type SurveyRow = {
  id: string
  title: string
  description: string | null
  status: string
  createdAt: string
  responseCount: number
}

const statusLabel: Record<string, string> = {
  draft: 'Taslak',
  published: 'Yayında',
  closed: 'Kapalı',
}

export function SurveyView() {
  const { selectedEventId } = useApp()
  const [rows, setRows] = useState<SurveyRow[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [surveyTitle, setSurveyTitle] = useState('')
  const [surveyDescription, setSurveyDescription] = useState('')
  const [createBusy, setCreateBusy] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [respondSurveyId, setRespondSurveyId] = useState<string | null>(null)
  const [respondentName, setRespondentName] = useState('')
  const [responseText, setResponseText] = useState('')
  const [respondBusy, setRespondBusy] = useState(false)
  const [respondError, setRespondError] = useState<string | null>(null)

  async function loadSurveys(eventId: string) {
    const body = await api<SurveyRow[]>(`/api/events/${encodeURIComponent(eventId)}/surveys`)
    setRows(Array.isArray(body) ? body : [])
  }

  useEffect(() => {
    if (!selectedEventId) return
    let cancelled = false
    loadSurveys(selectedEventId).catch(() => {
      if (!cancelled) setFailed(true)
    })
    return () => {
      cancelled = true
    }
  }, [selectedEventId])

  async function createSurvey() {
    if (!selectedEventId) return
    if (!surveyTitle.trim()) {
      setCreateError('Anket başlığı gerekli.')
      return
    }
    setCreateBusy(true)
    setCreateError(null)
    try {
      await api(`/api/events/${encodeURIComponent(selectedEventId)}/surveys`, {
        method: 'POST',
        body: JSON.stringify({ title: surveyTitle.trim(), description: surveyDescription.trim() || null }),
      })
      setSurveyTitle('')
      setSurveyDescription('')
      setFailed(false)
      await loadSurveys(selectedEventId)
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Anket oluşturulamadı.')
    } finally {
      setCreateBusy(false)
    }
  }

  async function submitResponse(surveyId: string) {
    if (!selectedEventId) return
    if (!responseText.trim()) {
      setRespondError('Yanıt metni gerekli.')
      return
    }
    setRespondBusy(true)
    setRespondError(null)
    try {
      await api(
        `/api/events/${encodeURIComponent(selectedEventId)}/surveys/${encodeURIComponent(surveyId)}/responses`,
        { method: 'POST', body: JSON.stringify({ respondentName: respondentName.trim() || null, answers: { text: responseText.trim() } }) },
      )
      setRespondentName('')
      setResponseText('')
      setRespondSurveyId(null)
      await loadSurveys(selectedEventId)
    } catch (error) {
      setRespondError(error instanceof Error ? error.message : 'Yanıt gönderilemedi.')
    } finally {
      setRespondBusy(false)
    }
  }

  return (
    <div className="space-y-4 p-4 sm:p-6" data-testid="survey-view">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold"><ClipboardList className="h-5 w-5 text-primary" /> Anketler</h2>
        <p className="text-xs text-muted-foreground">Seçili etkinliğin anketleri; salt-okunur listedir, kayıt buradan yapılmaz.</p>
      </div>
      {selectedEventId ? (
        <div data-testid="survey-create-form" className="flex flex-col gap-2 rounded-md border p-3">
          <div className="text-sm font-semibold">Yeni anket</div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              aria-label="Anket başlığı"
              value={surveyTitle}
              onChange={(event) => setSurveyTitle(event.target.value)}
              placeholder="Anket başlığı"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
            <input
              aria-label="Anket açıklaması"
              value={surveyDescription}
              onChange={(event) => setSurveyDescription(event.target.value)}
              placeholder="Açıklama (opsiyonel)"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={createBusy}
              onClick={createSurvey}
              className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              Anket oluştur
            </button>
          </div>
          {createError ? <div role="alert" className="text-xs text-destructive">{createError}</div> : null}
        </div>
      ) : null}
      {!selectedEventId ? (
        <div className="p-6 text-sm text-muted-foreground">Önce etkinlik seçin — anketler event bağlamı olmadan listelenmez.</div>
      ) : rows === null && !failed ? (
        <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><ClipboardList className="h-4 w-4 animate-spin" /> Anketler yükleniyor...</div>
      ) : failed || rows === null ? (
        <div className="p-6 text-sm text-muted-foreground">Anket listesi alınamadı; sayfayı yenileyin.</div>
      ) : rows.length === 0 ? (
        <div className="p-6 text-sm text-muted-foreground">Bu etkinlikte anket yok.</div>
      ) : (
        <div className="grid gap-3">
          {rows.map((row) => (
            <Card key={row.id} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{row.title}</div>
                {row.description ? <div className="mt-1 truncate text-xs text-muted-foreground">{row.description}</div> : null}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="outline">{statusLabel[row.status] ?? row.status}</Badge>
                <span className="text-muted-foreground">
                  {row.responseCount === 0 ? 'Yanıt yok' : `${row.responseCount} yanıt`}
                </span>
              </div>
              <div className="mt-1">
                <button
                  type="button"
                  onClick={() => { setRespondSurveyId(respondSurveyId === row.id ? null : row.id); setRespondError(null) }}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Yanıtla
                </button>
                {respondSurveyId === row.id ? (
                  <div data-testid="survey-respond-form" className="mt-2 flex flex-col gap-2">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        aria-label="Yanıtlayan adı"
                        value={respondentName}
                        onChange={(event) => setRespondentName(event.target.value)}
                        placeholder="Adınız (opsiyonel)"
                        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                      />
                      <input
                        aria-label="Yanıt metni"
                        value={responseText}
                        onChange={(event) => setResponseText(event.target.value)}
                        placeholder="Yanıtınız"
                        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                      />
                      <button
                        type="button"
                        disabled={respondBusy}
                        onClick={() => submitResponse(row.id)}
                        className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
                      >
                        Gönder
                      </button>
                    </div>
                    {respondError ? <div role="alert" className="text-xs text-destructive">{respondError}</div> : null}
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
