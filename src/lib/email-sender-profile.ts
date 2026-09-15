import type { EmailMessageClass } from '@/lib/email-policy'

export type SenderProfileHealthStatus = 'pending_verification' | 'healthy' | 'paused' | 'error'

export type SenderProfileInput = {
  workspaceId: string
  messageClass: EmailMessageClass
  provider: string
  sendingDomain: string
  fromAddress: string
  replyToAddress?: string
}

export type SenderProfile = {
  workspaceId: string
  messageClass: EmailMessageClass
  provider: string
  sendingDomain: string
  fromAddress: string
  replyToAddress?: string
  healthStatus: SenderProfileHealthStatus
  enabled: boolean
}

const messageClasses: EmailMessageClass[] = ['transactional', 'notification', 'marketing']
const domainPattern = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i
const addressPattern = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/

function requireText(value: string, error: string): string {
  const normalized = value.trim()
  if (!normalized) throw new Error(error)
  return normalized
}

function validateFromAddress(value: string): string {
  const normalized = requireText(value, 'sender_profile_from_invalid')
  const mailbox = normalized.match(/<([^<>]+)>/)?.[1] ?? normalized
  if (!addressPattern.test(mailbox)) throw new Error('sender_profile_from_invalid')
  return normalized
}

export function normalizeSenderProfile(input: SenderProfileInput): SenderProfile {
  const workspaceId = requireText(input.workspaceId, 'sender_profile_workspace_invalid')
  if (!messageClasses.includes(input.messageClass)) throw new Error('sender_profile_message_class_invalid')

  const sendingDomain = requireText(input.sendingDomain, 'sender_profile_domain_invalid').toLowerCase()
  if (!domainPattern.test(sendingDomain)) throw new Error('sender_profile_domain_invalid')

  const replyToAddress = input.replyToAddress?.trim()
  if (replyToAddress && !addressPattern.test(replyToAddress)) throw new Error('sender_profile_reply_to_invalid')

  return {
    workspaceId,
    messageClass: input.messageClass,
    provider: requireText(input.provider, 'sender_profile_provider_invalid').toLowerCase(),
    sendingDomain,
    fromAddress: validateFromAddress(input.fromAddress),
    ...(replyToAddress ? { replyToAddress } : {}),
    healthStatus: 'pending_verification',
    enabled: false,
  }
}

export function senderProfileRequiresVerification(profile: SenderProfile): boolean {
  return profile.healthStatus !== 'healthy'
}
