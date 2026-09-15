'use client'

import { FileCog, LockKeyhole } from 'lucide-react'
import { ConnectionWizard, type ConnectionWizardStep } from '@/components/mavenforms/connection-wizard'

export const FUTURE_INVOICE_STEPS: readonly ConnectionWizardStep[] = Object.freeze([
  { id: 'provider', label: 'Sağlayıcı', description: 'Provider-neutral bağlantı türünü belirle' },
  { id: 'scope', label: 'Kapsam', description: 'Belge ve form sınırlarını tanımla' },
  { id: 'evidence', label: 'Kanıt', description: 'Resmi hukuk, muhasebe ve provider kanıtını kontrol et' },
  { id: 'review', label: 'İnceleme', description: 'Ayrı release kapısından önce güvenli taslağı gözden geçir' },
])

export type FutureInvoiceEvidenceStatus = 'blocked' | 'local' | 'external'
export type FutureInvoiceProvider = 'parasut' | 'provider_neutral'

export type FutureInvoiceCapability = Readonly<{
  enabled: boolean
  reason: 'automatic_documents_disabled' | 'legal_evidence_required' | 'ready_for_separate_release_gate'
}>

export type FutureInvoiceWizardProps = Readonly<{
  provider?: FutureInvoiceProvider
  evidenceStatus?: FutureInvoiceEvidenceStatus
  automatedDocumentsEnabled?: boolean
}>

/** Decides only the future capability state; it never enables a provider or creates a document. */
export function futureInvoiceCapability(input: Readonly<{
  evidenceStatus?: unknown
  automatedDocumentsEnabled?: unknown
}> = {}): FutureInvoiceCapability {
  if (input.automatedDocumentsEnabled !== true) return { enabled: false, reason: 'automatic_documents_disabled' }
  if (input.evidenceStatus !== 'external') return { enabled: false, reason: 'legal_evidence_required' }
  return { enabled: true, reason: 'ready_for_separate_release_gate' }
}

function providerLabel(provider: FutureInvoiceProvider) {
  return provider === 'parasut' ? 'Paraşüt API v4 (ileri faz adayı)' : 'Provider-neutral e-belge adapterı'
}

/** Shows the future adapter boundary while preserving the active manual invoice fallback. */
export function FutureInvoiceWizard({
  provider = 'parasut',
  evidenceStatus = 'blocked',
  automatedDocumentsEnabled = false,
}: FutureInvoiceWizardProps) {
  const capability = futureInvoiceCapability({ evidenceStatus, automatedDocumentsEnabled })

  return (
    <ConnectionWizard steps={FUTURE_INVOICE_STEPS} initialStepId="provider" draftId="future-invoice-api">
      {(step) => (
        <div className="space-y-2" data-future-invoice-step={step.id}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold"><FileCog className="h-4 w-4 text-primary" /> Gelecekteki fatura/API bağlantısı</h3>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </div>
            <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-medium text-amber-800">Otomatik e-belge kapalı</span>
          </div>
          <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
            <p><span className="font-medium text-foreground">Sağlayıcı:</span> {providerLabel(provider)}</p>
            <p><span className="font-medium text-foreground">Dış kanıt:</span> {evidenceStatus === 'external' ? 'Mevcut' : 'Bekleniyor'}</p>
          </div>
          <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground"><LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {capability.enabled ? 'Kanıt kaydı var; ayrı release kapısı tamamlanmadan etkinleştirilmez.' : 'Hukuk, muhasebe ve provider dış kanıtı olmadan otomasyon etkinleştirilemez.'}</p>
          <p className="text-[11px] text-muted-foreground">Manuel fatura yükle → eşleştir → yetkili onay → document-ready yolu aktif fallback olarak korunur.</p>
        </div>
      )}
    </ConnectionWizard>
  )
}
