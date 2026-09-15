import assert from 'node:assert'
import { buildProviderAcceptedOutboxData } from '../src/lib/outbox-provider-acceptance.ts'

const acceptedAt = new Date('2026-09-03T03:30:00.000Z')
assert.deepEqual(
  buildProviderAcceptedOutboxData({ provider: 'Mailchimp_Transactional', providerMessageId: ' tx_123 ', acceptedAt }),
  {
    status: 'sent',
    sentAt: acceptedAt,
    provider: 'mailchimp_transactional',
    providerMessageId: 'tx_123',
    lockedBy: null,
    lockedUntil: null,
  },
  'provider acceptance must persist identity while keeping delivery separate',
)
assert.throws(() => buildProviderAcceptedOutboxData({ provider: 'stripe', providerMessageId: '', acceptedAt }), /provider_message_id_invalid/)
assert.throws(() => buildProviderAcceptedOutboxData({ provider: 'stripe', providerMessageId: 'tx\n123', acceptedAt }), /provider_message_id_invalid/)

console.log('outbox-provider-acceptance.test: PASS (MAIL-12E)')
