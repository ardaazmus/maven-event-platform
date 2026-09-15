'use client'

import { useId, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, RefreshCw, X } from 'lucide-react'

export type ConnectionWizardStep = Readonly<{
  id: string
  label: string
  description?: string
}>

export const DEFAULT_CONNECTION_WIZARD_STEPS: readonly ConnectionWizardStep[] = Object.freeze([
  { id: 'scope', label: 'Kapsam', description: 'Bağlantı amacını belirleyin' },
  { id: 'credentials', label: 'Kimlik bilgileri', description: 'Güvenli bağlantı yöntemini seçin' },
  { id: 'verify', label: 'Doğrulama', description: 'Sunucu tarafı kanıtı kontrol edin' },
  { id: 'review', label: 'İnceleme', description: 'Ayarları etkinleştirmeden önce gözden geçirin' },
])

export function getConnectionWizardStepIndex(steps: readonly ConnectionWizardStep[], stepId: unknown): number {
  const index = steps.findIndex(step => step.id === stepId)
  return index >= 0 ? index : 0
}

export type ConnectionWizardProps = Readonly<{
  steps?: readonly ConnectionWizardStep[]
  initialStepId?: string
  draftId?: string | null
  onStepChange?: (stepId: string) => void
  onCancel?: () => void
  onRefresh?: () => void
  children?: ReactNode | ((step: ConnectionWizardStep) => ReactNode)
}>

/** Shared, side-effect-free shell for resumable connection setup flows. */
export function ConnectionWizard({
  steps = DEFAULT_CONNECTION_WIZARD_STEPS,
  initialStepId,
  draftId,
  onStepChange,
  onCancel,
  onRefresh,
  children,
}: ConnectionWizardProps) {
  const safeSteps = steps.length > 0 ? steps : DEFAULT_CONNECTION_WIZARD_STEPS
  const [stepIndex, setStepIndex] = useState(() => getConnectionWizardStepIndex(safeSteps, initialStepId))
  const step = safeSteps[stepIndex]
  const wizardId = useId()
  const panelId = `${wizardId}-panel`
  const isFirst = stepIndex === 0
  const isLast = stepIndex === safeSteps.length - 1

  function moveTo(nextIndex: number) {
    const boundedIndex = Math.max(0, Math.min(nextIndex, safeSteps.length - 1))
    setStepIndex(boundedIndex)
    onStepChange?.(safeSteps[boundedIndex].id)
  }

  return (
    <section className="space-y-4 rounded-lg border border-border bg-background p-4" aria-label="Bağlantı sihirbazı">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Bağlantı kurulumu</p>
          <h2 className="text-base font-semibold">Adım adım yapılandırma</h2>
          {draftId && <p className="mt-1 text-xs text-muted-foreground">Taslak: {draftId}</p>}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onRefresh} disabled={!onRefresh} className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50">
            <RefreshCw className="h-3.5 w-3.5" /> Yenile
          </button>
          <button type="button" onClick={onCancel} disabled={!onCancel} className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50">
            <X className="h-3.5 w-3.5" /> Vazgeç
          </button>
        </div>
      </div>

      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="tablist" aria-label="Bağlantı adımları">
        {safeSteps.map((item, index) => (
          <li key={item.id}>
            <button
              type="button"
              id={`${wizardId}-tab-${item.id}`}
              role="tab"
              aria-selected={index === stepIndex}
              aria-current={index === stepIndex ? 'step' : undefined}
              aria-controls={panelId}
              onClick={() => moveTo(index)}
              className={`min-h-11 w-full min-w-0 rounded-md border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${index === stepIndex ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'}`}
            >
              <span className="block text-xs font-semibold">{index + 1}. {item.label}</span>
              {item.description && <span className="mt-1 block break-words text-[11px] text-muted-foreground">{item.description}</span>}
            </button>
          </li>
        ))}
      </ol>

      <div id={panelId} role="tabpanel" tabIndex={0} aria-labelledby={`${wizardId}-tab-${step.id}`} aria-label={step.label} className="min-h-20 min-w-0 rounded-md border border-border/70 p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
        {typeof children === 'function' ? children(step) : children}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border/70 pt-3">
        <button type="button" onClick={() => moveTo(stepIndex - 1)} disabled={isFirst} className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50">
          <ChevronLeft className="h-3.5 w-3.5" /> Geri
        </button>
        <span className="text-xs text-muted-foreground">{stepIndex + 1} / {safeSteps.length}</span>
        <button type="button" onClick={() => moveTo(stepIndex + 1)} disabled={isLast} className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50">
          İleri <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </section>
  )
}
