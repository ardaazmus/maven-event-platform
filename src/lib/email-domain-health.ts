export type EmailDnsCheckStatus = 'unknown' | 'pending' | 'pass' | 'fail'

export type EmailDomainHealthInput = {
  domain: string
  spf: EmailDnsCheckStatus
  dkim: EmailDnsCheckStatus
  dmarc: EmailDnsCheckStatus
  alignment: EmailDnsCheckStatus
  tls: EmailDnsCheckStatus
}

export type EmailDomainHealth = EmailDomainHealthInput & {
  domain: string
  overall: 'healthy' | 'pending' | 'error'
}

const dnsStatuses: EmailDnsCheckStatus[] = ['unknown', 'pending', 'pass', 'fail']
const domainPattern = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i

export function normalizeDomainHealth(input: EmailDomainHealthInput): EmailDomainHealth {
  const domain = input.domain.trim().toLowerCase()
  if (!domainPattern.test(domain)) throw new Error('email_domain_invalid')

  const statuses = [input.spf, input.dkim, input.dmarc, input.alignment, input.tls]
  if (statuses.some((status) => !dnsStatuses.includes(status))) throw new Error('email_dns_status_invalid')

  const overall = statuses.includes('fail')
    ? 'error'
    : statuses.every((status) => status === 'pass')
      ? 'healthy'
      : 'pending'

  return { domain, spf: input.spf, dkim: input.dkim, dmarc: input.dmarc, alignment: input.alignment, tls: input.tls, overall }
}

export function canEnableBulkSending(health: EmailDomainHealth): boolean {
  return health.overall === 'healthy'
}
