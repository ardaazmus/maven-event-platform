'use client'

import { ConnectionWizard, type ConnectionWizardStep } from '@/components/mavenforms/connection-wizard'

export const MANUAL_INVOICE_STEPS: readonly ConnectionWizardStep[] = Object.freeze([
  { id: 'upload', label: 'Yükle', description: 'Muhasebecinin kestiği belgeyi private karantinaya al' },
  { id: 'match', label: 'Eşleştir', description: 'Ödeme ve katılımcı kaydıyla server tarafında eşleştir' },
  { id: 'approve', label: 'Onayla', description: 'Yetkili kullanıcı belgeyi inceleyip onaylar' },
  { id: 'document_ready', label: 'Hazır', description: 'Temiz belge ayrı fatura mailine hazırlanır' },
])

export type ManualInvoicePhase = 'upload' | 'match' | 'approve' | 'document_ready'

export type ManualInvoiceWizardProps = Readonly<{
  phase?: ManualInvoicePhase
}>

/** Shows the manual accounting handoff without uploading, approving or sending a document. */
export function ManualInvoiceWizard({ phase = 'upload' }: ManualInvoiceWizardProps) {
  return (
    <ConnectionWizard steps={MANUAL_INVOICE_STEPS} initialStepId={phase} draftId="manual-invoice">
      {(step) => (
        <div className="space-y-2" data-invoice-wizard-phase={step.id}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold">Manuel fatura akışı</h3>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </div>
            <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-medium text-amber-800">Otomatik fatura kapalı</span>
          </div>
          <p className="text-[11px] text-muted-foreground">Belge önce güvenlik taramasından geçer. Eşleşme, yetkili onay ve document-ready olmadan ayrı fatura e-postası gönderilmez.</p>
        </div>
      )}
    </ConnectionWizard>
  )
}
