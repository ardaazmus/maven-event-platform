'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Download, FileText, Loader2, Send, Upload } from 'lucide-react'
import { api, getStoredToken } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { ManualInvoiceWizard } from '@/components/mavenforms/manual-invoice-wizard'
import { FutureInvoiceWizard } from '@/components/mavenforms/future-invoice-wizard'
import { TransactionalMailWizard } from '@/components/mavenforms/transactional-mail-wizard'
import { MediaDocumentWizard } from '@/components/mavenforms/media-document-wizard'
import { CapabilityEvidenceChecklist } from '@/components/mavenforms/capability-evidence-checklist'

type InvoiceCenterItem = {
  form: { title: string }
  submission: { id: string; status: string; source: string; submittedAt: string } | null
  payment: { id: string; provider: string; mode: string; status: string; amountMinor: number; currency: string }
  invoice: { id: string; documentType: string; amountMinor: number; currency: string; state: string }
  documents: Array<{ id: string; artifactKind: string; state: string; scanStatus: string; visibility: string }>
  deliveries: Array<{ id: string; channel: string; status: string; sentAt: string | null }>
}

const refundLikeStates = new Set(['refunded', 'partially_refunded', 'disputed'])

function exportFileName(response: Response): string {
  const value = response.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1]
  return value || 'mavenforms-fatura-export.xlsx'
}

export function InvoiceCenterView({ formId }: { formId: string }) {
  const [rows, setRows] = useState<InvoiceCenterItem[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState<'export' | 'import' | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const data = await api<InvoiceCenterItem[]>(`/api/invoices/center?formId=${encodeURIComponent(formId)}&limit=25`)
      setRows(Array.isArray(data) ? data : [])
      setSelected(new Set())
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [formId])

  const eligible = useMemo(() => rows.filter(row => row.payment.status === 'succeeded' && !refundLikeStates.has(row.payment.status)), [rows])
  const selectedRows = rows.filter(row => selected.has(row.payment.id))
  const eligibleSelected = selectedRows.filter(row => eligible.some(item => item.payment.id === row.payment.id))

  const downloadExport = async () => {
    if (!eligibleSelected.length) return
    setWorking('export')
    try {
      const token = getStoredToken()
      const response = await fetch('/api/invoices/export', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ mode: eligibleSelected.length === 1 ? 'single' : 'bulk', paymentOrderIds: eligibleSelected.map(row => row.payment.id) }),
      })
      if (!response.ok) throw new Error('Fatura export işlemi başarısız')
      const link = document.createElement('a')
      link.href = URL.createObjectURL(await response.blob())
      link.download = exportFileName(response)
      link.click()
      URL.revokeObjectURL(link.href)
      toast({ title: 'Fatura export hazır', description: `${eligibleSelected.length} kayıt indirildi` })
    } catch (error) {
      toast({ title: 'Export başarısız', description: error instanceof Error ? error.message : 'Tekrar deneyin', variant: 'destructive' })
    } finally {
      setWorking(null)
    }
  }

  const uploadImport = async (file: File) => {
    setWorking('import')
    try {
      const token = getStoredToken()
      const body = new FormData()
      body.append('file', file)
      const response = await fetch('/api/invoices/import', { method: 'POST', credentials: 'include', headers: token ? { Authorization: `Bearer ${token}` } : undefined, body })
      if (!response.ok) throw new Error('Muhasebe import işlemi başarısız')
      toast({ title: 'Import karantinaya alındı', description: 'Dosya güvenlik ve muhasebe kontrollerinden sonra işlenecek' })
    } catch (error) {
      toast({ title: 'Import başarısız', description: error instanceof Error ? error.message : 'Tekrar deneyin', variant: 'destructive' })
    } finally {
      setWorking(null)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="mb-5 space-y-4">
      <ManualInvoiceWizard phase={rows.length ? 'match' : 'upload'} />
      <FutureInvoiceWizard />
      <TransactionalMailWizard />
      <MediaDocumentWizard />
      <CapabilityEvidenceChecklist />
      <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-base font-semibold"><FileText className="h-4 w-4 text-primary" /> Fatura merkezi</h3>
          <p className="text-xs text-muted-foreground">Ödeme, fatura, belge ve teslimat durumları ayrı tutulur.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={event => { const file = event.target.files?.[0]; if (file) void uploadImport(file) }} />
          <Button type="button" size="sm" variant="outline" disabled={working !== null} onClick={() => inputRef.current?.click()}><Upload className="h-3.5 w-3.5" /> Muhasebeden import</Button>
          <Button type="button" size="sm" disabled={!eligibleSelected.length || working !== null} onClick={() => void downloadExport()}><Download className="h-3.5 w-3.5" /> Seçileni export</Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 border-b border-border bg-muted/20 px-4 py-3 text-xs">
        <Badge variant="outline">Toplam {rows.length}</Badge>
        <Badge variant="outline">Export uygun {eligible.length}</Badge>
        <Badge variant="outline">Seçili {selectedRows.length}</Badge>
        {selectedRows.length > eligibleSelected.length && <span className="inline-flex items-center gap-1 text-amber-700"><AlertTriangle className="h-3.5 w-3.5" /> İade/uygunsuz kayıtlar export dışı</span>}
      </div>
      {loading || working ? (
        <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> {working === 'import' ? 'Import alınıyor...' : working === 'export' ? 'Export hazırlanıyor...' : 'Faturalar yükleniyor...'}</div>
      ) : rows.length === 0 ? (
        <div className="p-6 text-sm text-muted-foreground">Bu forma bağlı fatura kaydı bulunmuyor.</div>
      ) : (
        <div className="divide-y divide-border">
          {rows.map(row => {
            const isEligible = eligible.some(item => item.payment.id === row.payment.id)
            const readyDocument = row.documents.some(document => document.state === 'ready' && document.scanStatus === 'clean' && document.visibility === 'private')
            return (
              <label key={row.payment.id} className="flex flex-col gap-3 p-4 transition-colors hover:bg-muted/20 sm:flex-row sm:items-center">
                <input type="checkbox" checked={selected.has(row.payment.id)} onChange={event => setSelected(previous => { const next = new Set(previous); if (event.target.checked) next.add(row.payment.id); else next.delete(row.payment.id); return next })} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm font-medium"><span className="truncate">{row.form.title}</span><Badge variant="outline">Ödeme: {row.payment.status}</Badge><Badge variant="outline">Fatura: {row.invoice.state}</Badge></div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground"><span>{row.payment.provider} · {row.payment.currency} {(row.payment.amountMinor / 100).toFixed(2)}</span><span>Belge: {readyDocument ? 'Hazır' : 'Hazır değil'}</span><span>Teslimat: {row.deliveries[0]?.status || 'Yok'}</span></div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {isEligible ? <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-label="Export uygun" /> : <AlertTriangle className="h-4 w-4 text-amber-600" aria-label="Export uygun değil" />}
                  <Button type="button" size="sm" variant="ghost" disabled aria-disabled="true" title="Toplu gönderim endpoint'i document-ready ve teslimat fazında bağlanacak"><Send className="h-3.5 w-3.5" /> Gönder</Button>
                </div>
              </label>
            )
          })}
        </div>
      )}
      </Card>
    </div>
  )
}
