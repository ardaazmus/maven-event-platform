import assert from 'node:assert'
import { buildEmailDeliverabilityMetrics } from '../src/lib/email-deliverability-metrics.ts'

assert.deepEqual(buildEmailDeliverabilityMetrics({
  outbox: [
    { status: 'queued' },
    { status: 'sending' },
    { status: 'sent' },
    { status: 'failed' },
    { status: 'dead' },
  ],
  providerEvents: [
    { eventType: 'delivered', processingStatus: 'processed' },
    { eventType: 'bounce', processingStatus: 'processed' },
    { eventType: 'reject', processingStatus: 'processed' },
    { eventType: 'complaint', processingStatus: 'processed' },
    { eventType: 'unsubscribe', processingStatus: 'processed' },
    { eventType: 'delivered', processingStatus: 'received' },
  ],
  marketingPaused: true,
}), {
  queued: 1,
  sending: 1,
  accepted: 1,
  failed: 2,
  delivered: 1,
  bounced: 1,
  rejected: 1,
  complaints: 1,
  unsubscribes: 1,
  marketingPaused: true,
  deliveryRatePercent: 100,
})

assert.deepEqual(buildEmailDeliverabilityMetrics({ outbox: [], providerEvents: [], marketingPaused: false }), {
  queued: 0,
  sending: 0,
  accepted: 0,
  failed: 0,
  delivered: 0,
  bounced: 0,
  rejected: 0,
  complaints: 0,
  unsubscribes: 0,
  marketingPaused: false,
  deliveryRatePercent: null,
})

console.log('email-deliverability-metrics.test: PASS (MAIL-15)')
