'use client'

import { MailCheck, ShieldCheck } from 'lucide-react'
import { ConnectionWizard, type ConnectionWizardStep } from '@/components/mavenforms/connection-wizard'

export const TRANSACTIONAL_MAIL_STEPS: readonly ConnectionWizardStep[] = Object.freeze([
  { id: 'channel', label: 'Kanal', description: 'Fatura teslimatını form bildiriminden ayır' },
  { id: 'document', label: 'Belge', description: 'Yalnız document-ready faturayı değerlendir' },
  { id: 'sender', label: 'Gönderici', description: 'Ayrı transactional sender profilini kontrol et' },
  { id: 'release', label: 'Release', description: 'Outbox ve dış kanıt kapısından önce gözden geçir' },
])

export type TransactionalMailCapability = Readonly<{
  enabled: boolean
  reason:
    | 'email_phase_gate'
    | 'message_class_invalid'
    | 'invoice_source_deferred'
    | 'document_not_ready'
    | 'sender_not_ready'
    | 'recipient_missing'
    | 'outbox_not_dispatchable'
    | 'ready_for_r10_release_gate'
}>

export type TransactionalMailCapabilityInput = Readonly<{
  emailHistoryComplete?: unknown
  messageClass?: unknown
  invoiceSource?: unknown
  documentReady?: unknown
  senderHealthy?: unknown
  recipientPresent?: unknown
  outboxDispatchable?: unknown
}>

export type TransactionalMailWizardProps = Readonly<{
  capability?: TransactionalMailCapabilityInput
}>

/** Evaluates the invoice-mail boundary without dispatching a message or changing state. */
export function transactionalMailCapability(input: TransactionalMailCapabilityInput = {}): TransactionalMailCapability {
  const messageClass = input.messageClass ?? 'transactional'
  const invoiceSource = input.invoiceSource ?? 'manual_accounting'
  if (input.emailHistoryComplete !== true) return { enabled: false, reason: 'email_phase_gate' }
  if (messageClass !== 'transactional') return { enabled: false, reason: 'message_class_invalid' }
  if (invoiceSource !== 'manual_accounting') return { enabled: false, reason: 'invoice_source_deferred' }
  if (input.documentReady !== true) return { enabled: false, reason: 'document_not_ready' }
  if (input.senderHealthy !== true) return { enabled: false, reason: 'sender_not_ready' }
  if (input.recipientPresent !== true) return { enabled: false, reason: 'recipient_missing' }
  if (input.outboxDispatchable !== true) return { enabled: false, reason: 'outbox_not_dispatchable' }
  return { enabled: true, reason: 'ready_for_r10_release_gate' }
}

/** Shows the separate invoice-mail boundary while keeping real delivery behind its release gates. */
export function TransactionalMailWizard({ capability: input = {} }: TransactionalMailWizardProps) {
  const capability = transactionalMailCapability(input)

  return (
    <ConnectionWizard steps={TRANSACTIONAL_MAIL_STEPS} initialStepId="channel" draftId="invoice-transactional-mail">
      {(step) => (
        <div className="space-y-2" data-transactional-mail-step={step.id}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold"><MailCheck className="h-4 w-4 text-primary" /> Fatura teslimat e-postası</h3>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </div>
            <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-medium text-amber-800">Gönderim kapalı</span>
          </div>
          <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
            <p><span className="font-medium text-foreground">Kanal:</span> transactional fatura maili</p>
            <p><span className="font-medium text-foreground">Form mailleri:</span> ayrı notification kanalı</p>
            <p><span className="font-medium text-foreground">Gönderici:</span> ayrı fatura sender profili</p>
          </div>
          <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {capability.enabled ? 'Yerel önkoşullar tamam; R-10 ve ayrı release kapısı olmadan gerçek teslimat açılmaz.' : 'Document-ready belge, transactional sender, alıcı ve outbox kanıtı tamamlanmadan fatura maili gönderilmez.'}</p>
          <p className="text-[11px] text-muted-foreground">Bu akış ödeme kanıtı üretmez; Paraşüt otomasyonu ertelenmiştir ve mevcut manuel muhasebe fallback’i korunur.</p>
        </div>
      )}
    </ConnectionWizard>
  )
}
