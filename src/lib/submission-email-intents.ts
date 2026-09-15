export type SubmissionEmailNotification = {
  id: string
  type: 'admin' | 'user_confirmation' | 'webhook'
  enabled: boolean
  config: {
    to?: string
    subject?: string
    body?: string
  }
}

export type SubmissionEmailIntent = {
  notificationId: string
  notificationType: 'admin' | 'user_confirmation'
  recipientEmail: string
  subject: string
  textBody: string
}

type SubmissionEmailIntentInput = {
  formTitle: string
  submissionId: string
  submitterEmail: string | null
  submittedAt?: string
  entryData?: string
  notifications: SubmissionEmailNotification[]
}

type SkippedNotification = {
  notificationId: string
  reason: 'admin_recipient_missing' | 'admin_recipient_invalid' | 'submitter_email_missing'
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const legacyTagPattern = /\{([a-z_][a-z0-9_]*)\}/gi

function renderSubmissionTemplate(source: string, values: Record<string, string>) {
  return source.replace(legacyTagPattern, (_match, tag: string) => values[tag.toLowerCase()] || '')
}

function normalizeEmail(value: string | null | undefined) {
  const email = value?.trim().toLowerCase() || ''
  return emailPattern.test(email) && email.length <= 320 ? email : null
}

function parseAdminRecipients(value: string | undefined) {
  if (!value?.trim()) return { emails: [], reason: 'admin_recipient_missing' as const }
  const emails = value
    .split(/[;,\n]/)
    .map(normalizeEmail)
    .filter((email): email is string => email !== null)
  return emails.length > 0
    ? { emails, reason: null }
    : { emails: [], reason: 'admin_recipient_invalid' as const }
}

/**
 * Resolves form notification settings into explicit server-side email intents.
 * Admin notifications use configured recipients; user confirmations use the submitter.
 * Webhook notifications never become email intents.
 */
export function buildSubmissionEmailIntents(input: SubmissionEmailIntentInput) {
  const intents: SubmissionEmailIntent[] = []
  const skipped: SkippedNotification[] = []
  const submitterEmail = normalizeEmail(input.submitterEmail)
  const templateValues = {
    form_title: input.formTitle,
    submission_id: input.submissionId,
    user_email: submitterEmail || '',
    date: input.submittedAt?.trim() || '',
    entry_data: input.entryData?.slice(0, 20_000) || '',
  }

  for (const notification of input.notifications) {
    if (!notification.enabled || notification.type === 'webhook') continue

    const subject = renderSubmissionTemplate(notification.config.subject?.trim() || (notification.type === 'admin' ? 'Yeni Kayıt: {form_title}' : 'Form yanıtınız alındı'), templateValues)
    const textBody = renderSubmissionTemplate(notification.config.body?.trim() || (notification.type === 'admin' ? 'Yeni bir form yanıtı alındı.\n{entry_data}' : 'Form yanıtınız başarıyla alındı.'), templateValues)
    if (notification.type === 'admin') {
      const recipients = parseAdminRecipients(notification.config.to)
      if (recipients.reason) {
        skipped.push({ notificationId: notification.id, reason: recipients.reason })
        continue
      }
      for (const recipientEmail of recipients.emails) {
        intents.push({ notificationId: notification.id, notificationType: notification.type, recipientEmail, subject, textBody })
      }
      continue
    }

    if (!submitterEmail) {
      skipped.push({ notificationId: notification.id, reason: 'submitter_email_missing' })
      continue
    }
    intents.push({ notificationId: notification.id, notificationType: notification.type, recipientEmail: submitterEmail, subject, textBody })
  }

  return { intents, skipped }
}
