'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api-client'
import { Card } from '@/components/ui/card'
import { Loader2, Wallet } from 'lucide-react'

type CurrencyRow = {
  currency: string
  collectedMinor: number
  openMinor: number
  unallocatedMinor: number
  pendingReviewMinor: number
}

const fmt = (currency: string, minor: number) => `${currency} ${(minor / 100).toFixed(2)}`

export function FinanceView() {
  const [rows, setRows] = useState<CurrencyRow[] | null>(null)
  const [denied, setDenied] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    api<{ currencies: CurrencyRow[] }>('/api/finance/summary')
      .then((body) => {
        if (!cancelled) setRows(Array.isArray(body?.currencies) ? body.currencies : [])
      })
      .catch((error: unknown) => {
        if (cancelled) return
        const status = (error as { status?: number } | null)?.status
        if (status === 403) setDenied(true)
        else setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-4 p-4 sm:p-6" data-testid="finance-view">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold"><Wallet className="h-5 w-5 text-primary" /> Finans Özeti</h2>
        <p className="text-xs text-muted-foreground">Mutabakat görünümü salt-okunurdur; tahsilat ve dağıtım işlemleri ayrı akışlardadır.</p>
      </div>
      {denied ? (
        <div className="p-6 text-sm text-muted-foreground">Bu ekran finans rolü gerektirir — erişim için çalışma alanı yöneticinize başvurun.</div>
      ) : rows === null && !failed ? (
        <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Özet yükleniyor...</div>
      ) : failed || rows === null ? (
        <div className="p-6 text-sm text-muted-foreground">Özet alınamadı; sayfayı yenileyin.</div>
      ) : rows.length === 0 ? (
        <div className="p-6 text-sm text-muted-foreground">Özetlenecek finans hareketi yok.</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((row) => (
            <Card key={row.currency} className="space-y-1 p-4 text-sm">
              <div className="font-semibold">{row.currency}</div>
              <dl className="space-y-0.5 text-xs">
                <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Tahsilat:</dt><dd>{fmt(row.currency, row.collectedMinor)}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Açık borç:</dt><dd>{fmt(row.currency, row.openMinor)}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Dağıtılmamış:</dt><dd>{fmt(row.currency, row.unallocatedMinor)}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-muted-foreground">İnceleme bekleyen:</dt><dd>{fmt(row.currency, row.pendingReviewMinor)}</dd></div>
              </dl>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
