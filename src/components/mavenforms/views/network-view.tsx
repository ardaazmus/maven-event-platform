'use client'

import { useEffect, useState } from 'react'
import { useApp } from '@/lib/store'
import { api } from '@/lib/api-client'
import { Card } from '@/components/ui/card'
import { Network } from 'lucide-react'

type LeadRow = {
  id: string
  fullName: string
  company: string | null
  email: string | null
  note: string | null
  createdAt: string
}

export function NetworkView() {
  const { selectedEventId } = useApp()
  const [rows, setRows] = useState<LeadRow[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!selectedEventId) return
    const eventId = selectedEventId
    let cancelled = false
    async function run() {
      try {
        const body = await api<LeadRow[]>(`/api/events/${encodeURIComponent(eventId)}/leads`)
        if (!cancelled) setRows(Array.isArray(body) ? body : [])
      } catch {
        if (!cancelled) setFailed(true)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [selectedEventId])

  return (
    <div className="space-y-4 p-4 sm:p-6" data-testid="network-view">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold"><Network className="h-5 w-5 text-primary" /> Leadler</h2>
        <p className="text-xs text-muted-foreground">Seçili etkinliğin leadleri; salt-okunur listedir, kayıt buradan yapılmaz.</p>
      </div>
      {!selectedEventId ? (
        <div className="p-6 text-sm text-muted-foreground">Önce etkinlik seçin — leadler event bağlamı olmadan listelenmez.</div>
      ) : rows === null && !failed ? (
        <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Network className="h-4 w-4 animate-spin" /> Leadler yükleniyor...</div>
      ) : failed || rows === null ? (
        <div className="p-6 text-sm text-muted-foreground">Lead listesi alınamadı; sayfayı yenileyin.</div>
      ) : rows.length === 0 ? (
        <div className="p-6 text-sm text-muted-foreground">Bu etkinlikte lead yok.</div>
      ) : (
        <div className="grid gap-3">
          {rows.map((row) => (
            <Card key={row.id} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{row.fullName}</div>
                {row.company ? <div className="mt-1 truncate text-xs text-muted-foreground">{row.company}</div> : null}
                {row.note ? <div className="mt-1 truncate text-xs text-muted-foreground">{row.note}</div> : null}
              </div>
              <div className="flex items-center gap-2 text-xs">
                {row.email ? <span className="text-muted-foreground">{row.email}</span> : null}
                <span className="text-muted-foreground">{new Date(row.createdAt).toLocaleDateString('tr-TR')}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
