import { normalizeDomainHealth, type EmailDomainHealth } from '@/lib/email-domain-health'
import type { EmailMessageClass } from '@/lib/email-policy'
import { normalizeSenderProfile, type SenderProfile, type SenderProfileHealthStatus } from '@/lib/email-sender-profile'

export type MailchimpTransactionalConnectionConfig = {
  appOrigin: string
  senderProfile: SenderProfile
  domainHealth: EmailDomainHealth
}

type RecordValue = Record<string, unknown>

const rootKeys = new Set(['appOrigin', 'senderProfile', 'domainHealth'])
const senderKeys = new Set(['workspaceId', 'messageClass', 'provider', 'sendingDomain', 'fromAddress', 'replyToAddress', 'healthStatus', 'enabled'])
const domainKeys = new Set(['domain', 'spf', 'dkim', 'dmarc', 'alignment', 'tls'])
const healthStatuses: SenderProfileHealthStatus[] = ['pending_verification', 'healthy', 'paused', 'error']

function objectValue(value: unknown): RecordValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('connection_public_config_invalid')
  return value as RecordValue
}

function allowOnly(record: RecordValue, allowed: Set<string>): void {
  if (Object.keys(record).some(key => !allowed.has(key))) throw new Error('connection_public_config_invalid')
}

function textValue(record: RecordValue, key: string): string {
  const value = record[key]
  if (typeof value !== 'string' || !value.trim()) throw new Error('connection_public_config_invalid')
  return value
}

function appOriginValue(record: RecordValue): string {
  const value = textValue(record, 'appOrigin').trim()
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
      throw new Error('connection_public_config_invalid')
    }
    return url.origin
  } catch {
    throw new Error('connection_public_config_invalid')
  }
}

function senderProfileValue(workspaceId: string, record: RecordValue): SenderProfile {
  allowOnly(record, senderKeys)
  const healthStatus = record.healthStatus
  if (typeof healthStatus !== 'string' || !healthStatuses.includes(healthStatus as SenderProfileHealthStatus)) {
    throw new Error('connection_public_config_invalid')
  }
  if (record.enabled !== true) throw new Error('connection_sender_not_ready')

  const normalized = normalizeSenderProfile({
    workspaceId: textValue(record, 'workspaceId'),
    messageClass: textValue(record, 'messageClass') as EmailMessageClass,
    provider: textValue(record, 'provider'),
    sendingDomain: textValue(record, 'sendingDomain'),
    fromAddress: textValue(record, 'fromAddress'),
    ...(record.replyToAddress === undefined ? {} : { replyToAddress: textValue(record, 'replyToAddress') }),
  })
  if (normalized.workspaceId !== workspaceId) throw new Error('connection_workspace_mismatch')
  if (normalized.provider !== 'mailchimp_transactional') throw new Error('connection_provider_mismatch')
  if (healthStatus !== 'healthy') throw new Error('connection_sender_not_ready')
  return { ...normalized, healthStatus, enabled: true }
}

function domainHealthValue(record: RecordValue, sendingDomain: string): EmailDomainHealth {
  allowOnly(record, domainKeys)
  const health = normalizeDomainHealth({
    domain: textValue(record, 'domain'),
    spf: textValue(record, 'spf') as 'unknown' | 'pending' | 'pass' | 'fail',
    dkim: textValue(record, 'dkim') as 'unknown' | 'pending' | 'pass' | 'fail',
    dmarc: textValue(record, 'dmarc') as 'unknown' | 'pending' | 'pass' | 'fail',
    alignment: textValue(record, 'alignment') as 'unknown' | 'pending' | 'pass' | 'fail',
    tls: textValue(record, 'tls') as 'unknown' | 'pending' | 'pass' | 'fail',
  })
  if (health.domain !== sendingDomain) throw new Error('connection_domain_mismatch')
  return health
}

/** Parses only the non-secret allowlisted configuration needed by a transactional send. */
export function parseMailchimpTransactionalConnectionConfig(workspaceId: string, publicConfigJson: string): MailchimpTransactionalConnectionConfig {
  const normalizedWorkspaceId = workspaceId.trim()
  if (!normalizedWorkspaceId) throw new Error('connection_workspace_invalid')

  let parsed: unknown
  try {
    parsed = JSON.parse(publicConfigJson)
  } catch {
    throw new Error('connection_public_config_invalid')
  }
  const record = objectValue(parsed)
  allowOnly(record, rootKeys)
  const appOrigin = appOriginValue(record)
  const senderProfile = senderProfileValue(normalizedWorkspaceId, objectValue(record.senderProfile))
  const domainHealth = domainHealthValue(objectValue(record.domainHealth), senderProfile.sendingDomain)
  if (domainHealth.overall !== 'healthy') throw new Error('connection_domain_not_ready')
  return { appOrigin, senderProfile, domainHealth }
}
