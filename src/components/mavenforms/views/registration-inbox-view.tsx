'use client'

import { useEffect, useState } from 'react'
import { useApp } from '@/lib/store'
import { api } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Inbox, Loader2 } from 'lucide-react'

type InboxRow = {
  id: string
  status: string
  formId: string | null
  createdAt: string
  person: { id: string; fullName: string; email: string | null }
}

export function RegistrationInboxView() {
  const { selectedEventId } = useApp()
  const [rows, setRows] = useState<InboxRow[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!selectedEventId) return
    let cancelled = false
    api<InboxRow[]>(`/api/registrations?eventId=${encodeURIComponent(selectedEventId)}`)
      .then((body) => {
        if (!cancelled) setRows(Array.isArray(body) ? body : [])
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [selectedEventId])

  return (
    <div className="space-y-4 p-4 sm:p-6" data-testid="registration-inbox">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold"><Inbox className="h-5 w-5 text-primary" /> Kayıtlar</h2>
        <p className="text-xs text-muted-foreground">Seçili etkinliğin kayıtları; salt-okunur listedir, durum değişimi buradan yapılmaz.</p>
      </div>
      {!selectedEventId ? (
        <div className="p-6 text-sm text-muted-foreground">Önce etkinlik seçin — kayıtlar event bağlamı olmadan listelenmez.</div>
      ) : rows === null && !failed ? (
        <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Kayıtlar yükleniyor...</div>
      ) : failed || rows === null ? (
        <div className="p-6 text-sm text-muted-foreground">Kayıt listesi alınamadı; sayfayı yenileyin.</div>
      ) : rows.length === 0 ? (
        <div className="p-6 text-sm text-muted-foreground">Bu etkinlikte kayıt yok.</div>
      ) : (
        <div className="grid gap-3">
          {rows.map((row) => (
            <Card key={row.id} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-medium"><span className="truncate">{row.person.fullName}</span></div>
                <div className="mt-1 text-xs text-muted-foreground">{row.person.email || 'e-posta yok'}</div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="outline">{row.status}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
