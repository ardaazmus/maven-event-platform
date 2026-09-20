'use client'

import { useEffect, useState } from 'react'
import { useApp } from '@/lib/store'
import { api } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, CircleDashed, LayoutDashboard, Loader2 } from 'lucide-react'

type GateKey = 'setup' | 'formBinding' | 'registration' | 'order' | 'ticket' | 'floor' | 'program' | 'hold'

const gateLabels: Record<GateKey, string> = {
  setup: 'Kurulum',
  formBinding: 'Form bağlantısı',
  registration: 'Kayıt',
  order: 'Sipariş',
  ticket: 'Bilet',
  floor: 'Floor plan',
  program: 'Program',
  hold: 'Rezervasyon',
}

type Readiness = {
  eventId: string
  title: string
  status: string
  gates: Record<GateKey, boolean>
  counts: Record<string, number>
}

export function EventDashboardView() {
  const { selectedEventId, setView } = useApp()
  const [data, setData] = useState<Readiness | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!selectedEventId) return
    let cancelled = false
    api<Readiness>(`/api/events/${encodeURIComponent(selectedEventId)}/readiness`)
      .then((body) => {
        if (!cancelled) setData(body ?? null)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [selectedEventId])

  const openCount = data ? (Object.keys(gateLabels) as GateKey[]).filter((key) => data.gates[key]).length : 0

  return (
    <div className="space-y-4 p-4 sm:p-6" data-testid="event-dashboard">
      {!selectedEventId ? (
        <div className="p-6 text-sm text-muted-foreground">Önce etkinlik seçin — özet seçili etkinliğe göre çıkarılır.</div>
      ) : data === null && !failed ? (
        <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Özet yükleniyor...</div>
      ) : failed || data === null ? (
        <div className="p-6 text-sm text-muted-foreground">Özet alınamadı; sayfayı yenileyin.</div>
      ) : (
        <>
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold"><LayoutDashboard className="h-5 w-5 text-primary" /> <span className="truncate">{data.title}</span></h2>
            <p className="text-xs text-muted-foreground">Durum: {data.status} · Kurulum readiness: {openCount}/{(Object.keys(gateLabels) as GateKey[]).length}</p>
          </div>
          <Card className="flex flex-wrap gap-2 p-4">
            {(Object.keys(gateLabels) as GateKey[]).map((key) => {
              const open = data.gates[key]
              return (
                <Badge key={key} variant={open ? 'default' : 'outline'} className="inline-flex items-center gap-1">
                  {open ? <CheckCircle2 className="h-3 w-3" /> : <CircleDashed className="h-3 w-3" />}
                  {gateLabels[key]}: {open ? 'açık' : 'kapalı'}
                </Badge>
              )
            })}
          </Card>
          <Card className="p-4 text-xs text-muted-foreground">
            Kayıt: {data.counts.registrations ?? 0} toplam · Occurrence: {data.counts.occurrences ?? 0} · Sipariş: {data.counts.orders ?? 0} · Bilet: {data.counts.tickets ?? 0}
          </Card>
          <Card className="flex flex-wrap gap-2 p-4" data-testid="event-dashboard-modules">
            <Button type="button" size="sm" variant="outline" onClick={() => setView('forms')} aria-label="Kayıt Formu modülünü aç">Kayıt Formu</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setView('registrations')} aria-label="Kayıtlar modülünü aç">Kayıtlar</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setView('finance')} aria-label="Finans modülünü aç">Finans</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setView('badges')} aria-label="Yaka Kartları modülünü aç">Yaka Kartları</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setView('checkin')} aria-label="Check-in modülünü aç">Check-in</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setView('floor')} aria-label="Floor Plan modülünü aç">Floor Plan</Button>
          </Card>
        </>
      )}
    </div>
  )
}
