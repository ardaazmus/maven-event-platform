import type { EmailMessageClass } from '@/lib/email-policy'

export type TransactionalEmailInput = {
  messageClass: EmailMessageClass
  subject: string
  textBody: string
  appOrigin: string
  documentUrl?: string | null
  providerUrl?: string | null
  campaignLinks?: readonly string[]
}

export type TransactionalEmail = {
  subject: string
  text: string
  html: string
}

export type EmailLogInput = {
  messageId: string
  messageClass: EmailMessageClass
  provider: string
  recipientEmail?: string
  providerSecret?: string
  body?: string
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] || character)
}

function validateInternalDocumentUrl(documentUrl: string, appOrigin: string): string {
  let app: URL
  let document: URL
  try {
    app = new URL(appOrigin)
    document = new URL(documentUrl)
  } catch {
    throw new Error('document URL must belong to the app origin')
  }
  if (!['http:', 'https:'].includes(app.protocol) || document.origin !== app.origin) throw new Error('document URL must belong to the app origin')
  return document.toString()
}

/** Builds a minimal safe transactional HTML/text email without exposing provider URLs. */
export function buildTransactionalEmail(input: TransactionalEmailInput): TransactionalEmail {
  if (!['transactional', 'notification'].includes(input.messageClass)) throw new Error('only transactional email classes are allowed')
  if (!input.subject.trim() || input.subject.includes('\r') || input.subject.includes('\n') || input.subject.length > 200) throw new Error('invalid email subject')
  if (input.textBody.length > 100_000) throw new Error('email body is too large')
  if (/\butm_[a-z0-9_]+\b|\bcampaign\b|\bunsubscribe\b/i.test(input.textBody) || (input.campaignLinks?.length || 0) > 0) throw new Error('campaign content is not allowed')
  if (input.providerUrl) throw new Error('raw provider URL is not allowed')

  const documentUrl = input.documentUrl ? validateInternalDocumentUrl(input.documentUrl, input.appOrigin) : null
  const escapedBody = escapeHtml(input.textBody).replace(/\r?\n/g, '<br>')
  const documentLink = documentUrl ? `<p><a href="${escapeHtml(documentUrl)}">Belgeyi görüntüle</a></p>` : ''
  return {
    subject: input.subject.trim(),
    text: input.textBody,
    html: `<p>${escapedBody}</p>${documentLink}`,
  }
}

/** Returns only non-sensitive identifiers suitable for structured delivery logs. */
export function safeEmailLogContext(input: EmailLogInput): { messageId: string; messageClass: EmailMessageClass; provider: string } {
  return {
    messageId: input.messageId,
    messageClass: input.messageClass,
    provider: input.provider,
  }
}
