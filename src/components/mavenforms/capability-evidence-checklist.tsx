'use client'

import { CheckCircle2, FlaskConical, ShieldAlert } from 'lucide-react'

export type CapabilityEvidenceStatus = 'tested' | 'verified' | 'blocked'

export type CapabilityEvidenceItem = Readonly<{
  id: string
  label: string
  status: CapabilityEvidenceStatus
  detail: string
}>

export const DEFAULT_CAPABILITY_EVIDENCE: readonly CapabilityEvidenceItem[] = Object.freeze([
  { id: 'v1_forms', label: 'V1 iç kullanım formları', status: 'verified', detail: 'Form, publish ve yanıt akışları yerel olarak doğrulandı' },
  { id: 'v2_payment', label: 'V2 first-party ödeme', status: 'tested', detail: 'Provider-neutral sandbox sözleşmesi; canlı merchant açılmadı' },
  { id: 'manual_invoice', label: 'Manuel fatura ve document-ready', status: 'verified', detail: 'Muhasebe upload, eşleştirme, onay ve hazır belge sınırı' },
  { id: 'transactional_mail', label: 'Transactional fatura maili', status: 'tested', detail: 'Ayrı kanal, sender ve outbox kapıları; gerçek teslimat kapalı' },
  { id: 'parasut', label: 'Paraşüt API v4 otomasyonu', status: 'blocked', detail: 'İleri faz; resmi provider ve muhasebe kanıtı bekleniyor' },
  { id: 'r10_live', label: 'R-10 production canlı açılışı', status: 'blocked', detail: 'Dış güvenlik, hukuk, provider ve operasyon kanıtları eksik' },
])

export function summarizeCapabilityEvidence(items: readonly CapabilityEvidenceItem[] = DEFAULT_CAPABILITY_EVIDENCE) {
  if (items.some(item => item.status === 'blocked')) return 'blocked' as const
  if (items.some(item => item.status === 'tested')) return 'partial' as const
  return 'verified' as const
}

function statusLabel(status: CapabilityEvidenceStatus) {
  if (status === 'tested') return 'Yerel test'
  if (status === 'verified') return 'Doğrulandı'
  return 'Bloklu'
}

function statusClass(status: CapabilityEvidenceStatus) {
  if (status === 'tested') return 'bg-blue-100 text-blue-800'
  if (status === 'verified') return 'bg-emerald-100 text-emerald-800'
  return 'bg-amber-100 text-amber-800'
}

/** Displays server-owned capability evidence without changing entitlements or release state. */
export function CapabilityEvidenceChecklist({ items = DEFAULT_CAPABILITY_EVIDENCE }: { items?: readonly CapabilityEvidenceItem[] }) {
  const summary = summarizeCapabilityEvidence(items)

  return (
    <section className="space-y-3 rounded-lg border border-border bg-background p-4" aria-label="Yetenek ve kanıt durumu">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Capability / evidence</p>
          <h3 className="text-base font-semibold">Bağlantı ve release kanıtları</h3>
        </div>
        <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${summary === 'blocked' ? 'bg-amber-100 text-amber-800' : summary === 'partial' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'}`}>
          {summary === 'blocked' ? 'Bazı kapılar bloklu' : summary === 'partial' ? 'Kısmi yerel kanıt' : 'Yerel olarak doğrulandı'}
        </span>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2" aria-label="Capability kanıt listesi">
        {items.map(item => (
          <li key={item.id} className="flex items-start gap-2 rounded-md border border-border/70 p-3">
            {item.status === 'tested' ? <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" aria-hidden="true" /> : item.status === 'verified' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" /> : <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-medium">
                <span>{item.label}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] ${statusClass(item.status)}`}>{statusLabel(item.status)}</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{item.detail}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-muted-foreground">Yerel test veya mock kanıtı production release onayı değildir; provider, R-10 ve bağımsız inceleme kapıları ayrı tutulur.</p>
    </section>
  )
}
