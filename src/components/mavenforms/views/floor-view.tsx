'use client'

import { useEffect, useState } from 'react'
import { useApp } from '@/lib/store'
import { api } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Loader2, Map } from 'lucide-react'

type Binding = { id: string; externalPlanId: string; planVersion: number; status: string }
type Hold = { id: string; spaceRef: string; status: string; expiresAt: string; orderId: string | null; assignedTicketId: string | null }

export function FloorView() {
  const { selectedEventId } = useApp()
  const [bindings, setBindings] = useState<Binding[] | null>(null)
  const [holds, setHolds] = useState<Hold[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!selectedEventId) return
    let cancelled = false
    const base = `/api/events/${encodeURIComponent(selectedEventId)}`
    Promise.all([api<Binding[]>(`${base}/plan-bindings`), api<Hold[]>(`${base}/holds`)])
      .then(([b, h]) => {
        if (cancelled) return
        setBindings(Array.isArray(b) ? b : [])
        setHolds(Array.isArray(h) ? h : [])
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [selectedEventId])

  const loading = selectedEventId !== null && !failed && (bindings === null || holds === null)

  return (
    <div className="space-y-4 p-4 sm:p-6" data-testid="floor-view">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold"><Map className="h-5 w-5 text-primary" /> Floor Plan</h2>
        <p className="text-xs text-muted-foreground">Plan geometrisi Floor Editor&apos;undur; burada yalnız sürüm ve rezervasyon durumu gösterilir.</p>
      </div>
      {!selectedEventId ? (
        <div className="p-6 text-sm text-muted-foreground">Önce etkinlik seçin — plan bağlamı olmadan açılmaz.</div>
      ) : loading ? (
        <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Plan yükleniyor...</div>
      ) : failed || bindings === null || holds === null ? (
        <div className="p-6 text-sm text-muted-foreground">Plan alınamadı; sayfayı yenileyin.</div>
      ) : (
        <>
          <div className="grid gap-2">
            {bindings.length === 0 && <div className="p-4 text-sm text-muted-foreground">Bağlı plan yok.</div>}
            {bindings.map((binding) => (
              <Card key={binding.id} className="flex flex-wrap items-center gap-2 p-3 text-sm">
                <span className="font-medium">Sürüm {binding.planVersion}</span>
                <Badge variant={binding.status === 'active' ? 'default' : 'outline'}>{binding.status}</Badge>
                <span className="text-xs text-muted-foreground">{binding.externalPlanId}</span>
              </Card>
            ))}
          </div>
          <div className="grid gap-2">
            {holds.length === 0 && <div className="p-4 text-sm text-muted-foreground">Rezervasyon kaydı yok.</div>}
            {holds.map((hold) => (
              <Card key={hold.id} className="flex flex-wrap items-center gap-2 p-3 text-sm">
                <span className="font-medium">{hold.spaceRef}</span>
                <Badge variant={hold.status === 'held' ? 'default' : 'outline'}>{hold.status}</Badge>
                <span className="text-xs text-muted-foreground">Vade: {new Date(hold.expiresAt).toLocaleString('tr-TR')}</span>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
