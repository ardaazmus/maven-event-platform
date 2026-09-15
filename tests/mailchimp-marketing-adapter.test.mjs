import assert from 'node:assert'
import { prepareMailchimpMarketingAudienceAdd } from '../src/lib/mailchimp-marketing-adapter.ts'
import { normalizeEmailSuppression } from '../src/lib/email-suppression.ts'
import { normalizeDomainHealth } from '../src/lib/email-domain-health.ts'
import { normalizeSenderProfile } from '../src/lib/email-sender-profile.ts'

const senderProfile = {
  ...normalizeSenderProfile({
    workspaceId: 'ws_1',
    messageClass: 'marketing',
    provider: 'mailchimp_marketing',
    sendingDomain: 'news.example.com',
    fromAddress: 'News <news@news.example.com>',
  }),
  healthStatus: 'healthy',
  enabled: true,
}

const domainHealth = normalizeDomainHealth({
  domain: 'news.example.com',
  spf: 'pass',
  dkim: 'pass',
  dmarc: 'pass',
  alignment: 'pass',
  tls: 'pass',
})

const baseInput = {
  workspaceId: 'ws_1',
  audienceId: 'aud_1',
  recipientEmail: 'Person@example.com',
  consentState: 'granted',
  suppressions: [],
  senderProfile,
  domainHealth,
  providerApiKeyEnvelope: 'v1:key-1:iv:tag:ciphertext',
}

assert.deepEqual(
  prepareMailchimpMarketingAudienceAdd(baseInput),
  {
    status: 'ready',
    provider: 'mailchimp_marketing',
    action: 'upsert_member',
    workspaceId: 'ws_1',
    audienceId: 'aud_1',
    recipientEmail: 'person@example.com',
  },
  'healthy, consented recipient should produce a safe provider command',
)

const blockedWithoutConsent = prepareMailchimpMarketingAudienceAdd({
  ...baseInput,
  consentState: 'unknown',
})
assert.deepEqual(blockedWithoutConsent, { status: 'blocked', reason: 'marketing_consent_required' })

const suppression = normalizeEmailSuppression({ email: baseInput.recipientEmail, reason: 'unsubscribe' })
const blockedBySuppression = prepareMailchimpMarketingAudienceAdd({
  ...baseInput,
  suppressions: [suppression],
})
assert.deepEqual(blockedBySuppression, { status: 'blocked', reason: 'recipient_suppressed' })

const blockedBySender = prepareMailchimpMarketingAudienceAdd({
  ...baseInput,
  senderProfile: { ...senderProfile, healthStatus: 'pending_verification' },
})
assert.deepEqual(blockedBySender, { status: 'blocked', reason: 'sender_profile_unhealthy' })

const blockedByDomain = prepareMailchimpMarketingAudienceAdd({
  ...baseInput,
  domainHealth: normalizeDomainHealth({ ...domainHealth, dmarc: 'pending' }),
})
assert.deepEqual(blockedByDomain, { status: 'blocked', reason: 'domain_unhealthy' })

const blockedWithoutSecret = prepareMailchimpMarketingAudienceAdd({
  ...baseInput,
  providerApiKeyEnvelope: '',
})
assert.deepEqual(blockedWithoutSecret, { status: 'blocked', reason: 'secret_not_ready' })

const command = prepareMailchimpMarketingAudienceAdd(baseInput)
assert.equal('providerApiKeyEnvelope' in command, false, 'provider secret must never be returned to callers')
assert.throws(
  () => prepareMailchimpMarketingAudienceAdd({ ...baseInput, senderProfile: { ...senderProfile, workspaceId: 'ws_2' } }),
  /workspace_mismatch/,
)

console.log('mailchimp-marketing-adapter.test: PASS (MAIL-11)')
