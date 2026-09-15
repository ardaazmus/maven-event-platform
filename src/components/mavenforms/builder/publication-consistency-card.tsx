import { AlertTriangle, CheckCircle2, CircleAlert } from 'lucide-react'
import type { FormDetail } from '@/lib/types'
import { getPublicationConsistencyChecks, type PublicationCheckState } from '@/lib/publication-consistency'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

function stateIcon(state: PublicationCheckState) {
  if (state === 'warning') return <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" />
  if (state === 'error') return <CircleAlert className="h-4 w-4 text-destructive" aria-hidden="true" />
  return <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
}

export function PublicationConsistencyCard({ form }: { form: FormDetail }) {
  const checks = getPublicationConsistencyChecks({
    title: form.title,
    slug: form.slug,
    fieldCount: form.fields.length,
    startDate: form.startDate,
    hasCoverImage: Boolean(form.settings?.coverMediaId || form.settings?.coverImageUrl),
    coverImageAlt: form.settings?.coverImageAlt,
  })

  return (
    <Card className="space-y-3 border-border/70 bg-muted/20 p-4" aria-label="Yayın öncesi kontrol">
      <div>
        <h3 className="text-sm font-semibold">Yayın öncesi kontrol</h3>
        <p className="mt-1 text-xs text-muted-foreground">Başlık, public bağlantı ve görsel bilgilerinin birlikte anlaşılır olduğundan emin olun.</p>
      </div>
      <ul className="space-y-2" aria-live="polite">
        {checks.map((check) => (
          <li key={check.id} className="flex items-start gap-2 text-xs">
            <span className="mt-0.5 shrink-0">{stateIcon(check.state)}</span>
            <span className="min-w-0">
              <span className={cn('font-medium', check.state === 'warning' && 'text-amber-700 dark:text-amber-300', check.state === 'error' && 'text-destructive')}>{check.label}</span>
              <span className="ml-1 text-muted-foreground">— {check.detail}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-muted-foreground">Bu panel bilgilendiricidir; yayın güvenliği ve public veri sınırı sunucu tarafından doğrulanır.</p>
    </Card>
  )
}
