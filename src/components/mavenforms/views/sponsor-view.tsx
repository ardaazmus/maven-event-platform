'use client'

import { useEffect, useState } from 'react'
import { useApp } from '@/lib/store'
import { api } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Building2 } from 'lucide-react'

type BoothRow = {
  id: string
  code: string
  zone: string | null
}

type SponsorRow = {
  id: string
  name: string
  tier: string
  website: string | null
  booths: BoothRow[]
}

const tierLabel: Record<string, string> = {
  platinum: 'Platin',
  gold: 'Altın',
  silver: 'Gümüş',
  standard: 'Standart',
}

export function SponsorView() {
  const { selectedEventId } = useApp()
  const [rows, setRows] = useState<SponsorRow[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [sponsorName, setSponsorName] = useState('')
  const [sponsorTier, setSponsorTier] = useState('standard')
  const [sponsorWebsite, setSponsorWebsite] = useState('')
  const [createBusy, setCreateBusy] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [boothSponsorId, setBoothSponsorId] = useState<string | null>(null)
  const [boothCode, setBoothCode] = useState('')
  const [boothZone, setBoothZone] = useState('')
  const [boothBusy, setBoothBusy] = useState(false)
  const [boothError, setBoothError] = useState<string | null>(null)

  async function loadSponsors(eventId: string) {
    const body = await api<SponsorRow[]>(`/api/events/${encodeURIComponent(eventId)}/sponsors`)
    setRows(Array.isArray(body) ? body : [])
  }

  useEffect(() => {
    if (!selectedEventId) return
    let cancelled = false
    loadSponsors(selectedEventId).catch(() => {
      if (!cancelled) setFailed(true)
    })
    return () => {
      cancelled = true
    }
  }, [selectedEventId])

  async function createSponsor() {
    if (!selectedEventId) return
    if (!sponsorName.trim()) {
      setCreateError('Sponsor adı gerekli.')
      return
    }
    setCreateBusy(true)
    setCreateError(null)
    try {
      await api(`/api/events/${encodeURIComponent(selectedEventId)}/sponsors`, {
        method: 'POST',
        body: JSON.stringify({ name: sponsorName.trim(), tier: sponsorTier, website: sponsorWebsite.trim() || null }),
      })
      setSponsorName('')
      setSponsorTier('standard')
      setSponsorWebsite('')
      setFailed(false)
      await loadSponsors(selectedEventId)
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Sponsor oluşturulamadı.')
    } finally {
      setCreateBusy(false)
    }
  }

  async function assignBooth(sponsorId: string) {
    if (!selectedEventId) return
    if (!boothCode.trim()) {
      setBoothError('Stand kodu gerekli.')
      return
    }
    setBoothBusy(true)
    setBoothError(null)
    try {
      await api(
        `/api/events/${encodeURIComponent(selectedEventId)}/sponsors/${encodeURIComponent(sponsorId)}/booths`,
        { method: 'POST', body: JSON.stringify({ code: boothCode.trim(), zone: boothZone.trim() || null }) },
      )
      setBoothCode('')
      setBoothZone('')
      setBoothSponsorId(null)
      await loadSponsors(selectedEventId)
    } catch (error) {
      setBoothError(error instanceof Error ? error.message : 'Stand atanamadı.')
    } finally {
      setBoothBusy(false)
    }
  }

  return (
    <div className="space-y-4 p-4 sm:p-6" data-testid="sponsor-view">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold"><Building2 className="h-5 w-5 text-primary" /> Sponsorlar</h2>
        <p className="text-xs text-muted-foreground">Seçili etkinliğin sponsor ve standları; salt-okunur listedir, kayıt buradan yapılmaz.</p>
      </div>
      {selectedEventId ? (
        <div data-testid="sponsor-create-form" className="flex flex-col gap-2 rounded-md border p-3">
          <div className="text-sm font-semibold">Yeni sponsor</div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              aria-label="Sponsor adı"
              value={sponsorName}
              onChange={(event) => setSponsorName(event.target.value)}
              placeholder="Sponsor adı"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
            <select
              aria-label="Sponsor seviyesi"
              value={sponsorTier}
              onChange={(event) => setSponsorTier(event.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="platinum">Platin</option>
              <option value="gold">Altın</option>
              <option value="silver">Gümüş</option>
              <option value="standard">Standart</option>
            </select>
            <input
              aria-label="Sponsor sitesi"
              value={sponsorWebsite}
              onChange={(event) => setSponsorWebsite(event.target.value)}
              placeholder="Site (opsiyonel)"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={createBusy}
              onClick={createSponsor}
              className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              Sponsor oluştur
            </button>
          </div>
          {createError ? <div role="alert" className="text-xs text-destructive">{createError}</div> : null}
        </div>
      ) : null}
      {!selectedEventId ? (
        <div className="p-6 text-sm text-muted-foreground">Önce etkinlik seçin — sponsorlar event bağlamı olmadan listelenmez.</div>
      ) : rows === null && !failed ? (
        <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Building2 className="h-4 w-4 animate-spin" /> Sponsorlar yükleniyor...</div>
      ) : failed || rows === null ? (
        <div className="p-6 text-sm text-muted-foreground">Sponsor listesi alınamadı; sayfayı yenileyin.</div>
      ) : rows.length === 0 ? (
        <div className="p-6 text-sm text-muted-foreground">Bu etkinlikte sponsor yok.</div>
      ) : (
        <div className="grid gap-3">
          {rows.map((row) => (
            <Card key={row.id} className="flex flex-col gap-1 p-4">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{row.name}</div>
                {row.website ? <div className="mt-1 truncate text-xs text-muted-foreground">{row.website}</div> : null}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <Badge variant="outline">{tierLabel[row.tier] ?? row.tier}</Badge>
                {row.booths.length === 0 ? (
                  <span className="text-xs text-muted-foreground">Stand atanmadı.</span>
                ) : (
                  row.booths.map((booth) => (
                    <Badge key={booth.id} variant="secondary">
                      {booth.code}{booth.zone ? ` · ${booth.zone}` : ''}
                    </Badge>
                  ))
                )}
              </div>
              <div className="mt-1">
                <button
                  type="button"
                  onClick={() => { setBoothSponsorId(boothSponsorId === row.id ? null : row.id); setBoothError(null) }}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Stand ata
                </button>
                {boothSponsorId === row.id ? (
                  <div data-testid="sponsor-booth-form" className="mt-2 flex flex-col gap-2">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        aria-label="Stand kodu"
                        value={boothCode}
                        onChange={(event) => setBoothCode(event.target.value)}
                        placeholder="Stand kodu"
                        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                      />
                      <input
                        aria-label="Stand bölgesi"
                        value={boothZone}
                        onChange={(event) => setBoothZone(event.target.value)}
                        placeholder="Bölge (opsiyonel)"
                        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                      />
                      <button
                        type="button"
                        disabled={boothBusy}
                        onClick={() => assignBooth(row.id)}
                        className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
                      >
                        Kaydet
                      </button>
                    </div>
                    {boothError ? <div role="alert" className="text-xs text-destructive">{boothError}</div> : null}
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
