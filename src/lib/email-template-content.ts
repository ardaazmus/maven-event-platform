export type EmailTemplateMergeTag =
  | 'form.name'
  | 'event.name'
  | 'participant.name'
  | 'registration.method'
  | 'registration.sponsorship'
  | 'payment.status'
  | 'event.date'
  | 'event.location'

export const EMAIL_TEMPLATE_MERGE_TAGS: ReadonlyArray<{
  name: EmailTemplateMergeTag
  label: string
  description: string
}> = Object.freeze([
  { name: 'form.name', label: 'Form adı', description: 'Kaydın geldiği formun adı' },
  { name: 'event.name', label: 'Etkinlik adı', description: 'Etkinlik veya kayıt başlığı' },
  { name: 'participant.name', label: 'Katılımcı adı', description: 'Formdan alınan katılımcı adı' },
  { name: 'registration.method', label: 'Kayıt yöntemi', description: 'Kayıt veya bilet yöntemi' },
  { name: 'registration.sponsorship', label: 'Sponsorluk açıklaması', description: 'Yetkili etkinlik açıklaması' },
  { name: 'payment.status', label: 'Ödeme durumu', description: 'Doğrulanmış ödeme durumu' },
  { name: 'event.date', label: 'Etkinlik tarihi', description: 'Yetkili etkinlik tarihi' },
  { name: 'event.location', label: 'Etkinlik yeri', description: 'Yetkili etkinlik yeri' },
])

type TemplateValues = Partial<Record<EmailTemplateMergeTag, string>>

export type RenderedEmailTemplateContent = Readonly<{
  subject: string
  textBody: string
  htmlBody?: string
}>

const TAG_PATTERN = /\{\{\s*([^{}]+?)\s*\}\}/g
const ALLOWED_TAGS = new Set<EmailTemplateMergeTag>(EMAIL_TEMPLATE_MERGE_TAGS.map(tag => tag.name))

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] || character)
}

function render(source: string, values: TemplateValues, html: boolean): string {
  return source.replace(TAG_PATTERN, (_match, rawTag: string) => {
    const tag = rawTag.trim()
    if (!ALLOWED_TAGS.has(tag as EmailTemplateMergeTag)) {
      throw new Error('merge_tag_invalid')
    }
    const value = values[tag as EmailTemplateMergeTag] ?? ''
    return html ? escapeHtml(value) : value
  })
}

export function renderEmailTemplateContent(input: {
  subject: string
  textBody: string
  htmlBody?: string
  values: TemplateValues
}): RenderedEmailTemplateContent {
  if (!input.subject.trim() || input.subject.includes('\r') || input.subject.includes('\n') || input.subject.length > 200) {
    throw new Error('subject_invalid')
  }
  if (input.textBody.length > 100_000 || (input.htmlBody !== undefined && input.htmlBody.length > 100_000)) {
    throw new Error('template_content_too_large')
  }
  const subject = render(input.subject, input.values, false).trim()
  if (!subject || subject.includes('\r') || subject.includes('\n') || subject.length > 200) {
    throw new Error('subject_invalid')
  }
  return Object.freeze({
    subject,
    textBody: render(input.textBody, input.values, false),
    ...(input.htmlBody !== undefined ? { htmlBody: render(input.htmlBody, input.values, true) } : {}),
  })
}
