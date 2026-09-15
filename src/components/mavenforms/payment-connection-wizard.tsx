'use client'

import { ConnectionWizard } from '@/components/mavenforms/connection-wizard'

export type PaymentWizardEvidenceStatus = 'blocked' | 'sandbox' | 'verified'

export type PaymentConnectionWizardProps = Readonly<{
  provider?: 'iyzico' | 'stripe'
  mode?: 'test' | 'live'
  amount?: number | null
  currency?: 'TRY' | 'USD' | 'EUR' | 'GBP'
  evidenceStatus?: PaymentWizardEvidenceStatus
}>

export function normalizePaymentWizardAmount(amount: unknown): number | null {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) return null
  return Math.round(amount * 100) / 100
}

/** Presents payment setup facts without initiating checkout or reading secrets. */
export function PaymentConnectionWizard({
  provider = 'iyzico',
  mode = 'test',
  amount = null,
  currency = 'TRY',
  evidenceStatus = 'blocked',
}: PaymentConnectionWizardProps) {
  const safeAmount = normalizePaymentWizardAmount(amount)
  const canEnable = mode === 'test' && evidenceStatus === 'sandbox' && safeAmount !== null
  const statusText = evidenceStatus === 'verified' ? 'Doğrulanmış kanıt' : evidenceStatus === 'sandbox' ? 'Sandbox kanıtı' : 'Kanıt bekleniyor · etkinleştirme kapalı'

  return (
    <ConnectionWizard draftId="payment-setup" initialStepId="scope">
      {(step) => (
        <div className="space-y-3" data-payment-wizard-state={step.id}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold">Ödeme bağlantısı</h3>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </div>
            <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${canEnable ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
              {canEnable ? 'Sandbox kullanılabilir' : 'Etkinleştirme kapalı'}
            </span>
          </div>
          <dl className="grid gap-2 text-xs sm:grid-cols-3">
            <div className="rounded-md bg-muted/50 p-2"><dt className="text-muted-foreground">Sağlayıcı</dt><dd className="font-medium">{provider === 'iyzico' ? 'iyzico · birincil TR' : 'Stripe · ileri aday'}</dd></div>
            <div className="rounded-md bg-muted/50 p-2"><dt className="text-muted-foreground">Mod</dt><dd className="font-medium">{mode === 'test' ? 'Test / sandbox' : 'Live · R-10 gerekli'}</dd></div>
            <div className="rounded-md bg-muted/50 p-2"><dt className="text-muted-foreground">Kanıt</dt><dd className="font-medium">{statusText}</dd></div>
          </dl>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-md border border-border px-3 py-2 text-xs"><span className="text-muted-foreground">Tutar</span><strong className="ml-2">{safeAmount === null ? 'Henüz tanımlanmadı' : safeAmount.toFixed(2)}</strong></div>
            <div className="rounded-md border border-border px-3 py-2 text-xs"><span className="text-muted-foreground">Para birimi</span><strong className="ml-2">{currency}</strong></div>
          </div>
          <p className="text-[11px] text-muted-foreground">Kart bilgileri MavenForms’ta tutulmaz. Hosted checkout ve sunucu tarafı webhook doğrulaması olmadan ödeme açılmaz.</p>
        </div>
      )}
    </ConnectionWizard>
  )
}
