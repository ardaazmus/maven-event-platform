import type { EmailMessageClass } from '@/lib/email-policy'
import { parseMailchimpTransactionalConnectionConfig } from '@/lib/mailchimp-connection-config'
import { prepareMailchimpTransactionalSend, sendMailchimpTransactionalMessage, type MailchimpTransactionalReadySend, type MailchimpTransactionalResponse } from '@/lib/mailchimp-transactional-adapter'
import type { SenderProfile } from '@/lib/email-sender-profile'

type OutboxEmailEvent = {
  id: string
  workspaceId: string
  type: string
  queueClass: string | null
  payloadJson: string
}

type ActiveEmailConnection = {
  id: string
  workspaceId: string
  provider: string
  status: string
  publicConfigJson: string
  credentialsEnvelope: string | null
}

type OutboxMailchimpDispatchInput = {
  outboxEvent: OutboxEmailEvent
  connection: ActiveEmailConnection
}

export type OutboxMailchimpDispatchResult =
  | {
      status: 'ready'
      command: MailchimpTransactionalReadySend
      senderProfile: SenderProfile
      providerApiKeyEnvelope: string
    }
  | {
      status: 'blocked'
      reason: 'connection_not_active' | 'connection_not_ready' | 'payload_invalid'
    }

function parsePayload(payloadJson: string) {
  let parsed: unknown
  try {
    parsed = JSON.parse(payloadJson)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  const payload = parsed as Record<string, unknown>
  if (typeof payload.recipientEmail !== 'string' || typeof payload.subject !== 'string' || typeof payload.textBody !== 'string') return null
  return {
    recipientEmail: payload.recipientEmail,
    subject: payload.subject,
    textBody: payload.textBody,
    documentUrl: typeof payload.documentUrl === 'string' ? payload.documentUrl : null,
  }
}

/**
 * Creates a server-only provider command from a claimed outbox event.
 * It performs no network call and never places the decrypted key in the provider command.
 */
export function prepareOutboxMailchimpDispatch(input: OutboxMailchimpDispatchInput): OutboxMailchimpDispatchResult {
  const { outboxEvent, connection } = input
  if (outboxEvent.type !== 'email' || !outboxEvent.queueClass || !['transactional', 'notification'].includes(outboxEvent.queueClass)) {
    return { status: 'blocked', reason: 'payload_invalid' }
  }
  if (connection.status !== 'active' || connection.provider !== 'mailchimp_transactional') {
    return { status: 'blocked', reason: 'connection_not_active' }
  }
  if (!connection.credentialsEnvelope) return { status: 'blocked', reason: 'connection_not_ready' }

  const payload = parsePayload(outboxEvent.payloadJson)
  if (!payload) return { status: 'blocked', reason: 'payload_invalid' }

  try {
    const config = parseMailchimpTransactionalConnectionConfig(connection.workspaceId, connection.publicConfigJson)
    if (connection.workspaceId !== outboxEvent.workspaceId) return { status: 'blocked', reason: 'connection_not_ready' }
    const command = prepareMailchimpTransactionalSend({
      workspaceId: outboxEvent.workspaceId,
      messageId: outboxEvent.id,
      messageClass: outboxEvent.queueClass as EmailMessageClass,
      recipientEmail: payload.recipientEmail,
      subject: payload.subject,
      textBody: payload.textBody,
      documentUrl: payload.documentUrl,
      appOrigin: config.appOrigin,
      senderProfile: config.senderProfile,
      domainHealth: config.domainHealth,
      providerApiKeyEnvelope: connection.credentialsEnvelope,
    })
    if (command.status !== 'ready') return { status: 'blocked', reason: 'connection_not_ready' }
    return { status: 'ready', command, senderProfile: config.senderProfile, providerApiKeyEnvelope: connection.credentialsEnvelope }
  } catch {
    return { status: 'blocked', reason: 'connection_not_ready' }
  }
}

type OutboxMailchimpHttpInput = OutboxMailchimpDispatchInput & {
  env?: NodeJS.ProcessEnv
  fetchImpl?: typeof fetch
}

/** Sends one preflighted outbox email through the server-only provider adapter. */
export async function sendOutboxMailchimpEmail(input: OutboxMailchimpHttpInput): Promise<MailchimpTransactionalResponse | Extract<OutboxMailchimpDispatchResult, { status: 'blocked' }>> {
  const prepared = prepareOutboxMailchimpDispatch(input)
  if (prepared.status !== 'ready') return prepared
  return sendMailchimpTransactionalMessage({
    command: prepared.command,
    senderProfile: prepared.senderProfile,
    providerApiKeyEnvelope: prepared.providerApiKeyEnvelope,
    env: input.env,
    fetchImpl: input.fetchImpl,
  })
}
