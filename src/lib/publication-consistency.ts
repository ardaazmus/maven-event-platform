export type PublicationCheckState = 'pass' | 'warning' | 'error'

export interface PublicationConsistencyInput {
  title: string | null | undefined
  slug: string | null | undefined
  fieldCount: number
  startDate?: string | null
  hasCoverImage: boolean
  coverImageAlt?: string | null
}

export interface PublicationConsistencyCheck {
  id: string
  label: string
  detail: string
  state: PublicationCheckState
}

function titleYears(title: string) {
  return [...title.matchAll(/\b(20\d{2})\b/g)].map((match) => Number(match[1]))
}

function dateYear(value: string | null | undefined) {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed.getUTCFullYear()
}

export function getPublicationConsistencyChecks(input: PublicationConsistencyInput): PublicationConsistencyCheck[] {
  const checks: PublicationConsistencyCheck[] = [
    {
      id: 'title',
      label: 'Form adı',
      detail: input.title?.trim() ? 'Katılımcı başlığı tanımlı.' : 'Katılımcı başlığı boş bırakılamaz.',
      state: input.title?.trim() ? 'pass' : 'error',
    },
    {
      id: 'slug',
      label: 'Public bağlantı',
      detail: input.slug?.trim() ? `/forms/${input.slug.trim()} bağlantısı korunuyor.` : 'Public bağlantı tanımlı değil.',
      state: input.slug?.trim() ? 'pass' : 'error',
    },
    {
      id: 'fields',
      label: 'Form alanları',
      detail: input.fieldCount > 0 ? `${input.fieldCount} alan yayın için hazır.` : 'En az bir alan eklenmeli.',
      state: input.fieldCount > 0 ? 'pass' : 'error',
    },
  ]

  const eventYear = dateYear(input.startDate)
  const yearsInTitle = titleYears(input.title || '')
  if (eventYear && yearsInTitle.length > 0 && !yearsInTitle.includes(eventYear)) {
    checks.push({
      id: 'date-title',
      label: 'Başlık ve tarih',
      detail: `Başlıkta ${yearsInTitle.join(', ')} yılı, başlangıç tarihinde ${eventYear} yılı görünüyor. Yayınlamadan önce kontrol edin.`,
      state: 'warning',
    })
  }

  if (input.hasCoverImage && !input.coverImageAlt?.trim()) {
    checks.push({
      id: 'cover-alt',
      label: 'Görsel açıklaması',
      detail: 'Kapak görseli seçili ancak alt metin boş; erişilebilirlik için açıklama ekleyin.',
      state: 'warning',
    })
  }

  return checks
}
