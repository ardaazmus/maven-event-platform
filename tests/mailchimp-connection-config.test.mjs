import assert from 'node:assert'
import { existsSync } from 'node:fs'
import { parseMailchimpTransactionalConnectionConfig } from '../src/lib/mailchimp-connection-config.ts'

const sourcePath = 'src/lib/mailchimp-connection-config.ts'
assert(existsSync(sourcePath), 'Mailchimp connection config parser must exist')

const config = JSON.stringify({
  appOrigin: 'https://forms.example.com',
  senderProfile: {
    workspaceId: 'ws_1',
    messageClass: 'notification',
    provider: 'Mailchimp_Transactional',
    sendingDomain: 'mail.example.com',
    fromAddress: 'MavenForms <notify@mail.example.com>',
    healthStatus: 'healthy',
    enabled: true,
  },
  domainHealth: {
    domain: 'mail.example.com',
    spf: 'pass',
    dkim: 'pass',
    dmarc: 'pass',
    alignment: 'pass',
    tls: 'pass',
  },
})

assert.deepEqual(parseMailchimpTransactionalConnectionConfig('ws_1', config), {
  appOrigin: 'https://forms.example.com',
  senderProfile: {
    workspaceId: 'ws_1',
    messageClass: 'notification',
    provider: 'mailchimp_transactional',
    sendingDomain: 'mail.example.com',
    fromAddress: 'MavenForms <notify@mail.example.com>',
    healthStatus: 'healthy',
    enabled: true,
  },
  domainHealth: {
    domain: 'mail.example.com',
    spf: 'pass',
    dkim: 'pass',
    dmarc: 'pass',
    alignment: 'pass',
    tls: 'pass',
    overall: 'healthy',
  },
})

assert.throws(() => parseMailchimpTransactionalConnectionConfig('ws_2', config), /connection_workspace_mismatch/)
assert.throws(() => parseMailchimpTransactionalConnectionConfig('ws_1', JSON.stringify({ ...JSON.parse(config), apiKey: 'never-public' })), /connection_public_config_invalid/)
assert.throws(() => parseMailchimpTransactionalConnectionConfig('ws_1', JSON.stringify({ ...JSON.parse(config), senderProfile: { ...JSON.parse(config).senderProfile, healthStatus: 'pending_verification' } })), /connection_sender_not_ready/)

console.log('mailchimp-connection-config.test: PASS (MAIL-13G)')
