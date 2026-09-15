import { canEnableBulkSending, type EmailDomainHealth } from '@/lib/email-domain-health'
import { decryptEmailCredential } from '@/lib/email-credentials'
import type { EmailMessageClass } from '@/lib/email-policy'
import { buildTransactionalEmail } from '@/lib/email-template-policy'
import { senderProfileRequiresVerification, type SenderProfile } from '@/lib/email-sender-profile'

export type MailchimpTransactionalSendInput = {
  workspaceId: string
  messageId: string
  messageClass: EmailMessageClass
  recipientEmail: string
  subject: string
  textBody: string
  appOrigin: string
  documentUrl?: string | null
  senderProfile: SenderProfile
  domainHealth: EmailDomainHealth
  providerApiKeyEnvelope: string
}

export type MailchimpTransactionalSendResult =
  | {
      status: 'ready'
      provider: 'mailchimp_transactional'
      action: 'send_message'
      workspaceId: string
      messageId: string
      messageClass: 'transactional' | 'notification'
      recipientEmail: string
      subject: string
      textBody: string
      htmlBody: string
    }
  | {
      status: 'blocked'
      reason: 'message_class_invalid' | 'template_invalid' | 'sender_profile_unhealthy' | 'domain_unhealthy' | 'secret_not_ready'
    }

export type MailchimpTransactionalProviderStatus = 'queued' | 'sent' | 'rejected' | 'invalid' | 'failed'

export type MailchimpTransactionalResponseInput = {
  providerStatus: string
  providerMessageId: string | null
}

export type MailchimpTransactionalResponse =
  | { sendStatus: 'accepted'; deliveryStatus: 'pending'; providerMessageId: string }
  | { sendStatus: 'rejected'; deliveryStatus: 'not_delivered'; reason: 'rejected' | 'invalid' | 'failed' }

export type MailchimpTransactionalReadySend = Extract<MailchimpTransactionalSendResult, { status: 'ready' }>

export type MailchimpTransactionalHttpSendInput = {
  command: MailchimpTransactionalReadySend
  senderProfile: SenderProfile
  providerApiKeyEnvelope: string
  env?: NodeJS.ProcessEnv
  fetchImpl?: typeof fetch
}

const credentialEnvelopePattern = /^v1:[A-Za-z0-9._-]{1,32}:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$/
const emailPattern = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/
const providerStatuses: MailchimpTransactionalProviderStatus[] = ['queued', 'sent', 'rejected', 'invalid', 'failed']

function isProviderStatus(value: string): value is MailchimpTransactionalProviderStatus {
  return providerStatuses.includes(value as MailchimpTransactionalProviderStatus)
}

function requireIdentifier(value: string, error: string): string {
  const normalized = value.trim()
  if (!normalized) throw new Error(error)
  return normalized
}

function normalizeRecipientEmail(value: string): string {
  const normalized = value.trim().toLowerCase()
  if (!emailPattern.test(normalized)) throw new Error('recipient_email_invalid')
  return normalized
}

function parseSenderAddress(value: string): { email: string; name?: string } {
  const normalized = value.trim()
  if (/[\r\n]/.test(normalized)) throw new Error('sender_profile_from_invalid')
  const mailbox = normalized.match(/<([^<>]+)>/)?.[1]?.trim() ?? normalized
  if (!emailPattern.test(mailbox)) throw new Error('sender_profile_from_invalid')
  const displayName = normalized.match(/^(.+?)\s*<[^<>]+>$/)?.[1]?.trim().replace(/^['"]|['"]$/g, '')
  return displayName ? { email: mailbox, name: displayName } : { email: mailbox }
}

/**
 * Validates the server-side boundary for Mailchimp Transactional. The
 * provider secret is intentionally consumed only by a later server adapter,
 * never returned in a browser-facing command or loggable result.
 */
export function prepareMailchimpTransactionalSend(
  input: MailchimpTransactionalSendInput,
): MailchimpTransactionalSendResult {
  const workspaceId = requireIdentifier(input.workspaceId, 'workspace_invalid')
  const messageId = requireIdentifier(input.messageId, 'message_id_invalid')
  const recipientEmail = normalizeRecipientEmail(input.recipientEmail)

  if (input.messageClass === 'marketing') return { status: 'blocked', reason: 'message_class_invalid' }
  if (input.messageClass !== 'transactional' && input.messageClass !== 'notification') {
    return { status: 'blocked', reason: 'message_class_invalid' }
  }
  if (input.senderProfile.workspaceId !== workspaceId) throw new Error('workspace_mismatch')
  if (input.senderProfile.provider !== 'mailchimp_transactional' || input.senderProfile.messageClass !== input.messageClass) {
    throw new Error('sender_profile_invalid')
  }
  if (input.domainHealth.domain !== input.senderProfile.sendingDomain) throw new Error('domain_mismatch')
  if (!credentialEnvelopePattern.test(input.providerApiKeyEnvelope)) return { status: 'blocked', reason: 'secret_not_ready' }
  if (senderProfileRequiresVerification(input.senderProfile) || !input.senderProfile.enabled) {
    return { status: 'blocked', reason: 'sender_profile_unhealthy' }
  }
  if (!canEnableBulkSending(input.domainHealth)) return { status: 'blocked', reason: 'domain_unhealthy' }

  let rendered: ReturnType<typeof buildTransactionalEmail>
  try {
    rendered = buildTransactionalEmail({
      messageClass: input.messageClass,
      subject: input.subject,
      textBody: input.textBody,
      appOrigin: input.appOrigin,
      documentUrl: input.documentUrl,
    })
  } catch {
    return { status: 'blocked', reason: 'template_invalid' }
  }

  return {
    status: 'ready',
    provider: 'mailchimp_transactional',
    action: 'send_message',
    workspaceId,
    messageId,
    messageClass: input.messageClass,
    recipientEmail,
    subject: rendered.subject,
    textBody: rendered.text,
    htmlBody: rendered.html,
  }
}

/** Maps provider acceptance separately from later delivery webhook events. */
export function mapMailchimpTransactionalResponse(
  input: MailchimpTransactionalResponseInput,
): MailchimpTransactionalResponse {
  const status = input.providerStatus.trim().toLowerCase()
  if (!isProviderStatus(status)) throw new Error('provider_status_invalid')

  if (status === 'queued' || status === 'sent') {
    const providerMessageId = input.providerMessageId?.trim()
    if (!providerMessageId) throw new Error('provider_message_id_invalid')
    return { sendStatus: 'accepted', deliveryStatus: 'pending', providerMessageId }
  }

  return { sendStatus: 'rejected', deliveryStatus: 'not_delivered', reason: status }
}

/**
 * Sends one already-approved message through the server-only Transactional API
 * boundary. The decrypted key exists only while constructing the request body;
 * it is never returned, logged, or included in the normalized result.
 */
export async function sendMailchimpTransactionalMessage(
  input: MailchimpTransactionalHttpSendInput,
): Promise<MailchimpTransactionalResponse> {
  const apiKey = decryptEmailCredential(input.providerApiKeyEnvelope, input.env)
  const sender = parseSenderAddress(input.senderProfile.fromAddress)
  if (input.senderProfile.replyToAddress && /[\r\n]/.test(input.senderProfile.replyToAddress)) {
    throw new Error('sender_profile_reply_to_invalid')
  }
  const message: Record<string, unknown> = {
    html: input.command.htmlBody,
    text: input.command.textBody,
    subject: input.command.subject,
    from_email: sender.email,
    to: [{ email: input.command.recipientEmail, type: 'to' }],
    metadata: { mavenforms_message_id: input.command.messageId },
  }
  if (sender.name) message.from_name = sender.name
  if (input.senderProfile.replyToAddress) message.headers = { 'Reply-To': input.senderProfile.replyToAddress }

  const response = await (input.fetchImpl ?? fetch)('https://mandrillapp.com/api/1.0/messages/send.json', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ key: apiKey, message }),
  })
  if (!response.ok) throw new Error('mailchimp_transactional_http_error')

  const responseText = await response.text()
  if (responseText.length > 1_000_000) throw new Error('mailchimp_transactional_response_too_large')

  let payload: unknown
  try {
    payload = JSON.parse(responseText)
  } catch {
    throw new Error('mailchimp_transactional_response_invalid')
  }
  if (!Array.isArray(payload) || payload.length !== 1 || !payload[0] || typeof payload[0] !== 'object') {
    throw new Error('mailchimp_transactional_response_invalid')
  }

  const providerMessage = payload[0] as { status?: unknown; _id?: unknown }
  if (typeof providerMessage.status !== 'string') throw new Error('mailchimp_transactional_response_invalid')
  const providerMessageId = typeof providerMessage._id === 'string' ? providerMessage._id : null
  return mapMailchimpTransactionalResponse({
    providerStatus: providerMessage.status,
    providerMessageId,
  })
}
