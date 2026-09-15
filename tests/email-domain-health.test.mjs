import assert from 'node:assert'
import { canEnableBulkSending, normalizeDomainHealth } from '../src/lib/email-domain-health.ts'

const healthy = normalizeDomainHealth({
  domain: ' Billing.Example.com ',
  spf: 'pass',
  dkim: 'pass',
  dmarc: 'pass',
  alignment: 'pass',
  tls: 'pass',
})

assert.deepEqual(healthy, {
  domain: 'billing.example.com',
  spf: 'pass',
  dkim: 'pass',
  dmarc: 'pass',
  alignment: 'pass',
  tls: 'pass',
  overall: 'healthy',
})
assert.equal(canEnableBulkSending(healthy), true)

const pending = normalizeDomainHealth({ ...healthy, dmarc: 'pending' })
assert.equal(pending.overall, 'pending')
assert.equal(canEnableBulkSending(pending), false)

const failed = normalizeDomainHealth({ ...healthy, dkim: 'fail' })
assert.equal(failed.overall, 'error')
assert.equal(canEnableBulkSending(failed), false)

assert.throws(() => normalizeDomainHealth({ ...healthy, domain: 'https://billing.example.com' }), /email_domain_invalid/)
assert.throws(() => normalizeDomainHealth({ ...healthy, tls: 'invalid' }), /email_dns_status_invalid/)

console.log('email-domain-health.test: PASS (MAIL-03)')
