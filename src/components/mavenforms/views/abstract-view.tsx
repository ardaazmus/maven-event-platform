'use client'

import { useEffect, useState } from 'react'
import { useApp } from '@/lib/store'
import { api } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { FileText } from 'lucide-react'

type AbstractRow = {
  id: string
  title: string
  authorName: string
  status: string
  createdAt: string
  reviewCount: number
  averageScore: number | null
}

const statusLabel: Record<string, string> = {
  submitted: 'Değerlendirme bekliyor',
  accepted: 'Kabul edildi',
  rejected: 'Reddedildi',
}

export function AbstractView() {
  const { selectedEventId } = useApp()
  const [rows, setRows] = useState<AbstractRow[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [authorName, setAuthorName] = useState('')
  const [submitTitle, setSubmitTitle] = useState('')
  const [submitBody, setSubmitBody] = useState('')
  const [submitBusy, setSubmitBusy] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [reviewAbstractId, setReviewAbstractId] = useState<string | null>(null)
  const [reviewScore, setReviewScore] = useState('')
  const [reviewComment, setReviewComment] = useState('')
  const [reviewBusy, setReviewBusy] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)

  async function loadAbstracts(eventId: string) {
    const body = await api<AbstractRow[]>(`/api/events/${encodeURIComponent(eventId)}/abstracts`)
    setRows(Array.isArray(body) ? body : [])
  }

  useEffect(() => {
    if (!selectedEventId) return
    let cancelled = false
    loadAbstracts(selectedEventId).catch(() => {
      if (!cancelled) setFailed(true)
    })
    return () => {
      cancelled = true
    }
  }, [selectedEventId])

  async function submitAbstract() {
    if (!selectedEventId) return
    if (!authorName.trim() || !submitTitle.trim() || !submitBody.trim()) {
      setSubmitError('Yazar, başlık ve gövde gerekli.')
      return
    }
    setSubmitBusy(true)
    setSubmitError(null)
    try {
      await api(`/api/events/${encodeURIComponent(selectedEventId)}/abstracts`, {
        method: 'POST',
        body: JSON.stringify({ authorName: authorName.trim(), title: submitTitle.trim(), body: submitBody.trim() }),
      })
      setAuthorName('')
      setSubmitTitle('')
      setSubmitBody('')
      setFailed(false)
      await loadAbstracts(selectedEventId)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Bildiri gönderilemedi.')
    } finally {
      setSubmitBusy(false)
    }
  }

  async function submitReview(abstractId: string) {
    if (!selectedEventId) return
    const score = Number(reviewScore)
    if (!Number.isInteger(score) || score < 0 || score > 100) {
      setReviewError('0-100 arası tam sayı skor girin.')
      return
    }
    setReviewBusy(true)
    setReviewError(null)
    try {
      await api(
        `/api/events/${encodeURIComponent(selectedEventId)}/abstracts/${encodeURIComponent(abstractId)}/reviews`,
        { method: 'POST', body: JSON.stringify({ score, comment: reviewComment.trim() || null }) },
      )
      setReviewScore('')
      setReviewComment('')
      setReviewAbstractId(null)
      await loadAbstracts(selectedEventId)
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : 'Değerlendirme kaydedilemedi.')
    } finally {
      setReviewBusy(false)
    }
  }

  return (
    <div className="space-y-4 p-4 sm:p-6" data-testid="abstract-view">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold"><FileText className="h-5 w-5 text-primary" /> Bildiriler</h2>
        <p className="text-xs text-muted-foreground">Seçili etkinliğin bildirileri; gönderim ve kart-ici değerlendirme buradan yapılır.</p>
      </div>
      {selectedEventId ? (
        <div data-testid="abstract-submit-form" className="flex flex-col gap-2 rounded-md border p-3">
          <div className="text-sm font-semibold">Yeni bildiri</div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              aria-label="Yazar adı"
              value={authorName}
              onChange={(event) => setAuthorName(event.target.value)}
              placeholder="Yazar adı"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
            <input
              aria-label="Bildiri başlığı"
              value={submitTitle}
              onChange={(event) => setSubmitTitle(event.target.value)}
              placeholder="Bildiri başlığı"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <textarea
            aria-label="Bildiri gövdesi"
            value={submitBody}
            onChange={(event) => setSubmitBody(event.target.value)}
            placeholder="Bildiri metni"
            rows={3}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={submitBusy}
              onClick={submitAbstract}
              className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              Bildiri gönder
            </button>
          </div>
          {submitError ? <div role="alert" className="text-xs text-destructive">{submitError}</div> : null}
        </div>
      ) : null}
      {!selectedEventId ? (
        <div className="p-6 text-sm text-muted-foreground">Önce etkinlik seçin — bildiriler event bağlamı olmadan listelenmez.</div>
      ) : rows === null && !failed ? (
        <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><FileText className="h-4 w-4 animate-spin" /> Bildiriler yükleniyor...</div>
      ) : failed || rows === null ? (
        <div className="p-6 text-sm text-muted-foreground">Bildiri listesi alınamadı; sayfayı yenileyin.</div>
      ) : rows.length === 0 ? (
        <div className="p-6 text-sm text-muted-foreground">Bu etkinlikte bildiri yok.</div>
      ) : (
        <div className="grid gap-3">
          {rows.map((row) => (
            <Card key={row.id} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{row.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{row.authorName}</div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="outline">{statusLabel[row.status] ?? row.status}</Badge>
                <span className="text-muted-foreground">
                  {row.reviewCount === 0 ? 'Değerlendirme yok' : `${row.reviewCount} değerlendirme · ort ${row.averageScore}`}
                </span>
              </div>
              <div className="mt-1">
                <button
                  type="button"
                  onClick={() => { setReviewAbstractId(reviewAbstractId === row.id ? null : row.id); setReviewError(null) }}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Değerlendir
                </button>
                {reviewAbstractId === row.id ? (
                  <div data-testid="abstract-review-form" className="mt-2 flex flex-col gap-2">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        aria-label="Skor 0-100"
                        inputMode="numeric"
                        value={reviewScore}
                        onChange={(event) => setReviewScore(event.target.value)}
                        placeholder="Skor 0-100"
                        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                      />
                      <input
                        aria-label="Değerlendirme yorumu"
                        value={reviewComment}
                        onChange={(event) => setReviewComment(event.target.value)}
                        placeholder="Yorum (opsiyonel)"
                        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                      />
                      <button
                        type="button"
                        disabled={reviewBusy}
                        onClick={() => submitReview(row.id)}
                        className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
                      >
                        Kaydet
                      </button>
                    </div>
                    {reviewError ? <div role="alert" className="text-xs text-destructive">{reviewError}</div> : null}
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
