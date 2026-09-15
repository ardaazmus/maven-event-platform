import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { createWebhookFixtureSet } from '../src/lib/webhook-test-fixtures.ts'
import { verifyStripeWebhookSignature } from '../src/lib/payment-webhook-signatures.ts'

const nowMs = 1_700_000_000_000
const signingKey = 'fixture-only-key'
const events = [
  { provider: 'stripe', externalEventId: 'evt-first', paymentId: 'pi-first', eventType: 'payment_intent.succeeded', eventSequence: 2, receivedAtMs: nowMs + 2, deliveryOrder: 0 },
  { provider: 'stripe', externalEventId: 'evt-first', paymentId: 'pi-first', eventType: 'payment_intent.succeeded', eventSequence: 2, receivedAtMs: nowMs + 3, deliveryOrder: 1 },
  { provider: 'stripe', externalEventId: 'evt-older', paymentId: 'pi-older', eventType: 'payment_intent.processing', eventSequence: 1, receivedAtMs: nowMs + 1, deliveryOrder: 2 },
]

const unsigned = createWebhookFixtureSet({ events })
assert.equal(unsigned.ok, true)
if (!unsigned.ok) throw new Error('fixture set should be valid')
assert.deepEqual(unsigned.fixtures.map(fixture => fixture.eventSequence), [2, 2, 1], 'delivery order must remain visible separately from event sequence')
assert.equal(unsigned.fixtures[0].dedupeKey, unsigned.fixtures[1].dedupeKey, 'duplicate/replay events must share a stable dedupe key')
assert.equal(unsigned.fixtures[0].signatureState, 'unsigned')
assert.equal(verifyStripeWebhookSignature(unsigned.fixtures[0].rawBody, unsigned.fixtures[0].signatureHeader, signingKey, nowMs), false)

const signedEvents = events.map(event => {
  const fixture = createWebhookFixtureSet({ events: [event] })
  assert.equal(fixture.ok, true)
  if (!fixture.ok) throw new Error('single fixture should be valid')
  const timestamp = Math.floor(nowMs / 1000)
  const digest = createHmac('sha256', signingKey).update(`${timestamp}.${fixture.fixtures[0].rawBody}`).digest('hex')
  return { ...event, signatureHeader: `t=${timestamp},v1=${digest}` }
})
const signed = createWebhookFixtureSet({ events: signedEvents })
assert.equal(signed.ok, true)
if (!signed.ok) throw new Error('signed fixture set should be valid')
assert.equal(signed.fixtures.every(fixture => fixture.signatureState === 'signed'), true)
for (const fixture of signed.fixtures) {
  assert.equal(verifyStripeWebhookSignature(fixture.rawBody, fixture.signatureHeader, signingKey, nowMs), true)
}

const tamperedBody = signed.fixtures[0].rawBody.replace('"sequence":2', '"sequence":99')
assert.equal(verifyStripeWebhookSignature(tamperedBody, signed.fixtures[0].signatureHeader, signingKey, nowMs), false)
assert.deepEqual(createWebhookFixtureSet({ events: [{ ...events[0], deliveryOrder: 0 }, { ...events[2], deliveryOrder: 0 }] }), { ok: false, reason: 'duplicate_delivery_order' })
assert.deepEqual(createWebhookFixtureSet({ events: [{ ...events[0], secretKey: 'never-accepted' }] }), { ok: false, reason: 'secret_forbidden' })
assert.deepEqual(createWebhookFixtureSet({ events: [{ ...events[0], rawPayload: '{}' }] }), { ok: false, reason: 'secret_forbidden' })

console.log('webhook-test-fixtures.test: PASS (R10-V4-18)')
