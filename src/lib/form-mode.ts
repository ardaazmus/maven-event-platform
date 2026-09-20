/**
 * Event-first form çalışma modu read-modeli (EF-03A).
 *
 * Mod, form satırında saklanmaz; EventFormBinding satırlarından türetilir:
 * - registration binding varsa → `event-registration`
 * - yalnız survey binding(ler)i varsa → `event-survey`
 * - binding yoksa / bilinmiyorsa → `general` (eski form uyumluluğu)
 *
 * Bu helper pure'dur: DB, fetch ve framework importu yoktur. Bilinmeyen
 * purpose değerleri fail-closed şekilde yok sayılır; seçim gerektiren
 * durumlarda sessiz varsayım yerine `general` dönülür.
 */

export const FORM_MODES = ['general', 'event-registration', 'event-survey'] as const
export type FormMode = (typeof FORM_MODES)[number]

export type FormBindingRef = {
  eventId: string
  purpose: string
}

const MODE_COPY: Record<FormMode, { label: string; description: string }> = {
  general: {
    label: 'Genel Form',
    description: 'Etkinlik gerektirmez; bağımsız veri toplama.',
  },
  'event-registration': {
    label: 'Etkinlik Kaydı Formu',
    description: 'Seçili etkinliğe kayıt üretir; etkinliksiz yayınlanamaz.',
  },
  'event-survey': {
    label: 'Etkinlik Anketi',
    description: 'Seçili etkinliğe bağlı anket toplar.',
  },
}

export function isFormMode(value: unknown): value is FormMode {
  return typeof value === 'string' && (FORM_MODES as readonly string[]).includes(value)
}

/** Binding listesinden form modunu türet; registration her zaman önceliklidir. */
export function resolveFormMode(bindings: readonly FormBindingRef[] | null | undefined): FormMode {
  if (!bindings || bindings.length === 0) return 'general'
  let sawSurvey = false
  for (const binding of bindings) {
    if (!binding || typeof binding.purpose !== 'string') continue
    if (binding.purpose === 'registration') return 'event-registration'
    if (binding.purpose === 'survey') sawSurvey = true
  }
  return sawSurvey ? 'event-survey' : 'general'
}

export function isEventForm(mode: unknown): boolean {
  return mode === 'event-registration' || mode === 'event-survey'
}

/** UI kopyası; bilinmeyen mod fail-closed şekilde genel forma düşer. */
export function describeFormMode(mode: unknown): { label: string; description: string } {
  if (isFormMode(mode)) return MODE_COPY[mode]
  return MODE_COPY.general
}
