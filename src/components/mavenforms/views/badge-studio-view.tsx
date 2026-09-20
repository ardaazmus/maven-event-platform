'use client'

import { useEffect, useState } from 'react'
import { useApp } from '@/lib/store'
import { api } from '@/lib/api-client'
import { BADGE_CONTEXT_FIELD_KEYS, BADGE_PERSON_FIELD_KEYS } from '@/lib/badge-field-mapping'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { IdCard, Loader2 } from 'lucide-react'

type CatalogItem = {
  templateId: string
  versionId: string
  originalName: string
  pageCount: 1 | 2
  widthPt: number
  heightPt: number
  visibility: 'private'
  validationStatus: 'VALIDATED'
}

export function BadgeStudioView() {
  const { selectedFormId } = useApp()
  const [items, setItems] = useState<CatalogItem[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [previewKey, setPreviewKey] = useState('')
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null)
  const [previewSubmissionId, setPreviewSubmissionId] = useState('')
  const [previewBusy, setPreviewBusy] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewResult, setPreviewResult] = useState<{ jobId: string; createdCount: number } | null>(null)

  async function selectPreviewVersion() {
    if (!selectedFormId || !previewKey) return
    const [templateId, versionId] = previewKey.split(':')
    if (!templateId || !versionId) return
    setPreviewBusy(true)
    setPreviewError(null)
    try {
      await api(`/api/forms/${encodeURIComponent(selectedFormId)}/badges/templates/selection`, {
        method: 'POST',
        body: JSON.stringify({ templateId, versionId }),
      })
      setSelectedVersion(previewKey)
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : 'Şablon seçilemedi.')
    } finally {
      setPreviewBusy(false)
    }
  }

  async function runSinglePreview() {
    if (!selectedFormId || !selectedVersion) return
    const submissionId = previewSubmissionId.trim()
    if (!submissionId) {
      setPreviewError('Önizleme için bir kayıt ID girin.')
      return
    }
    const [templateId, versionId] = selectedVersion.split(':')
    const item = (items ?? []).find((entry) => entry.templateId === templateId && entry.versionId === versionId)
    setPreviewBusy(true)
    setPreviewError(null)
    setPreviewResult(null)
    try {
      const body = await api<{ data: { jobId: string; createdCount: number } }>(
        `/api/forms/${encodeURIComponent(selectedFormId)}/badges/generate`,
        {
          method: 'POST',
          body: JSON.stringify({
            templateId,
            templateVersionId: versionId,
            selectionMode: 'SINGLE',
            submissionIds: [submissionId],
            faceMode: item && item.pageCount === 2 ? 'DUAL_FACE' : 'SINGLE_FACE',
          }),
        },
      )
      setPreviewResult({ jobId: String(body.data?.jobId ?? ''), createdCount: Number(body.data?.createdCount ?? 0) })
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : 'Önizleme üretilemedi.')
    } finally {
      setPreviewBusy(false)
    }
  }

  useEffect(() => {
    if (!selectedFormId) return
    let cancelled = false
    api<{ data: { templates: CatalogItem[] } }>(`/api/forms/${encodeURIComponent(selectedFormId)}/badges/templates/catalog`)
      .then((body) => {
        if (!cancelled) setItems(Array.isArray(body.data?.templates) ? body.data.templates : [])
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [selectedFormId])

  return (
    <div className="space-y-4 p-4 sm:p-6" data-testid="badge-studio">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold"><IdCard className="h-5 w-5 text-primary" /> Yaka Kartları — Şablon</h2>
        <p className="text-xs text-muted-foreground">Adım 1/7: yalnız doğrulanmış şablonlar listelenir; yükleme ve eşleme ayrı adımlardır.</p>
      </div>
      <div data-testid="badge-mapping-panel">
        <h3 className="text-sm font-semibold">Adım 2/7: Alan eşleme allowlist</h3>
        <p className="text-xs text-muted-foreground">Yaka kartına yalnız bu alanlar basılabilir; e-posta, telefon, ödeme, parola, jeton ve yönetici alanları kapalıdır.</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {[...BADGE_PERSON_FIELD_KEYS, ...BADGE_CONTEXT_FIELD_KEYS].map((key) => (
            <Badge key={key} variant="secondary">{key}</Badge>
          ))}
        </div>
      </div>
      <div data-testid="badge-preview-panel">
        <h3 className="text-sm font-semibold">Adım 3/7: Üretim önizlemesi</h3>
        <p className="text-xs text-muted-foreground">Seçili doğrulanmış sürümle tek kayıt önizlenir; sonuç karantinada bekler, tarama sonrası indirilebilir. Toplu üretim ve export bu adımda kapalıdır.</p>
        <div className="mt-2 flex flex-col gap-2">
          <select
            aria-label="Önizleme şablon sürümü"
            value={previewKey}
            disabled={!items || items.length === 0 || previewBusy}
            onChange={(event) => setPreviewKey(event.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Sürüm seçin…</option>
            {(items ?? []).map((item) => (
              <option key={`${item.templateId}:${item.versionId}`} value={`${item.templateId}:${item.versionId}`}>
                {item.originalName} · {item.versionId} · {item.pageCount === 2 ? 'çift yüz' : 'tek yüz'}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" disabled={!selectedFormId || !previewKey || previewBusy} onClick={selectPreviewVersion}>
              Sürümü seç
            </Button>
          </div>
          {selectedVersion ? (
            <div className="flex flex-col gap-2 rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Seçili sürüm: {selectedVersion}</div>
              <input
                aria-label="Önizleme kayıt ID"
                value={previewSubmissionId}
                onChange={(event) => setPreviewSubmissionId(event.target.value)}
                placeholder="Kayıt ID girin"
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              />
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" disabled={!selectedFormId || previewBusy} onClick={runSinglePreview}>
                  Tek önizleme üret
                </Button>
              </div>
            </div>
          ) : null}
          {previewError ? <div role="alert" className="text-xs text-destructive">{previewError}</div> : null}
          {previewResult ? (
            <div className="text-xs text-muted-foreground">İş {previewResult.jobId}: {previewResult.createdCount} kart karantinaya alındı; tarama gerekli, doğrudan indirme yok.</div>
          ) : null}
        </div>
      </div>
      {!selectedFormId ? (
        <div className="p-6 text-sm text-muted-foreground">Önce form seçin — şablon kataloğu form bağlamı olmadan açılmaz.</div>
      ) : items === null && !failed ? (
        <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Şablonlar yükleniyor...</div>
      ) : failed || items === null ? (
        <div className="p-6 text-sm text-muted-foreground">Katalog alınamadı; sayfayı yenileyin.</div>
      ) : items.length === 0 ? (
        <div className="p-6 text-sm text-muted-foreground">Doğrulanmış şablon yok.</div>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => (
            <Card key={`${item.templateId}:${item.versionId}`} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{item.originalName}</div>
                <div className="mt-1 text-xs text-muted-foreground">Versiyon {item.versionId} · {item.pageCount === 2 ? 'çift yüz' : 'tek yüz'} · {item.widthPt}×{item.heightPt}pt</div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="outline">{item.validationStatus}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
