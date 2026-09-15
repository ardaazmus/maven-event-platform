/**
 * V1 kullanım profili sözleşmesi.
 *
 * Profil, formun kullanım amacına göre editör varsayılanlarını ve rapor
 * görünümünü seçer. Yetki, ödeme, fatura veya otomatik mali karar açmaz.
 * Profil form ayarlarına kaydedilir; yayın sırasında üretilen FormVersion
 * snapshot'ı immutable olduğu için sonradan profil değişimi eski snapshot'ı
 * değiştirmez.
 */

export const FORM_USE_PROFILES = ['event_registration', 'research_survey', 'quiz'] as const
export type FormUseProfile = typeof FORM_USE_PROFILES[number]

export type FormUseProfileConfig = {
  profile: FormUseProfile
  defaultFieldTypes: readonly string[]
  defaultHelpText: string
  reportView: 'responses' | 'distributions' | 'score_summary'
  scoringEnabled: boolean
  paymentCapabilityEnabled: false
  paymentDecisionAutomation: false
}

const PROFILE_CONFIGS: Record<FormUseProfile, FormUseProfileConfig> = {
  event_registration: {
    profile: 'event_registration',
    defaultFieldTypes: ['text', 'email', 'phone', 'select'],
    defaultHelpText: 'Katılımcı bilgilerini ve kayıt seçimini toplayın.',
    reportView: 'responses',
    scoringEnabled: false,
    paymentCapabilityEnabled: false,
    paymentDecisionAutomation: false,
  },
  research_survey: {
    profile: 'research_survey',
    defaultFieldTypes: ['radio', 'checkbox', 'rating', 'paragraph'],
    defaultHelpText: 'Yanıtları karşılaştırılabilir ve anlaşılır biçimde toplayın.',
    reportView: 'distributions',
    scoringEnabled: false,
    paymentCapabilityEnabled: false,
    paymentDecisionAutomation: false,
  },
  quiz: {
    profile: 'quiz',
    defaultFieldTypes: ['radio', 'checkbox', 'select'],
    defaultHelpText: 'Soruları ve cevap seçeneklerini açık biçimde yapılandırın.',
    reportView: 'score_summary',
    scoringEnabled: true,
    paymentCapabilityEnabled: false,
    paymentDecisionAutomation: false,
  },
}

export function isFormUseProfile(value: unknown): value is FormUseProfile {
  return typeof value === 'string' && (FORM_USE_PROFILES as readonly string[]).includes(value)
}

/** Returns a frozen config or null; unknown input is intentionally fail-closed. */
export function getFormUseProfileConfig(value: unknown): FormUseProfileConfig | null {
  if (!isFormUseProfile(value)) return null
  return PROFILE_CONFIGS[value]
}

export function defaultFormUseProfile(): FormUseProfile {
  return 'event_registration'
}
