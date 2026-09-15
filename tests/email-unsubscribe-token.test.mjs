import assert from 'node:assert'
import { createHmac } from 'node:crypto'
import {
  createMarketingUnsubscribeToken,
  MARKETING_UNSUBSCRIBE_TTL_MS,
  verifyMarketingUnsubscribeToken,
} from '../src/lib/email-unsubscribe-token.ts'

const secret = 'unsubscribe-secret-for-tests'
const token = createMarketingUnsubscribeToken({
  workspaceId: 'workspace-1',
  recipientEmail: ' Person@Example.COM ',
}, secret, 1_000)
const recipientHash = createHmac('sha256', secret).update('person@example.com').digest('hex')

assert(!token.includes('person@example.com'), 'unsubscribe token must not expose recipient email')
assert.deepEqual(verifyMarketingUnsubscribeToken(token, secret, 1_001), {
  version: 'v1',
  workspaceId: 'workspace-1',
  recipientHash,
  scope: 'marketing',
  expiresAt: 1_000 + MARKETING_UNSUBSCRIBE_TTL_MS,
})
assert.equal(verifyMarketingUnsubscribeToken(token, secret, 1_000 + MARKETING_UNSUBSCRIBE_TTL_MS), null, 'expired unsubscribe token must be rejected')
assert.equal(verifyMarketingUnsubscribeToken(`${token}tampered`, secret, 1_001), null, 'tampered unsubscribe token must be rejected')
assert.equal(verifyMarketingUnsubscribeToken(token, 'another-unsubscribe-secret'), null, 'wrong unsubscribe secret must be rejected')
assert.throws(() => createMarketingUnsubscribeToken({ workspaceId: '', recipientEmail: 'person@example.com' }, secret, 1_000), /workspace id is required/)

console.log('email-unsubscribe-token.test: PASS (MAIL-10)')
