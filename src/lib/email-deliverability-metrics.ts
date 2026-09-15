export type EmailDeliverabilityOutboxItem = { status: string }
export type EmailDeliverabilityProviderEvent = { eventType: string; processingStatus: string }

export type EmailDeliverabilityMetrics = {
  queued: number
  sending: number
  accepted: number
  failed: number
  delivered: number
  bounced: number
  rejected: number
  complaints: number
  unsubscribes: number
  marketingPaused: boolean
  deliveryRatePercent: number | null
}

export type EmailDeliverabilityMetricsInput = {
  outbox: readonly EmailDeliverabilityOutboxItem[]
  providerEvents: readonly EmailDeliverabilityProviderEvent[]
  marketingPaused: boolean
}

/** Aggregates only durable email states; provider acceptance is not delivery. */
export function buildEmailDeliverabilityMetrics(input: EmailDeliverabilityMetricsInput): EmailDeliverabilityMetrics {
  const queued = input.outbox.filter(item => item.status === 'queued').length
  const sending = input.outbox.filter(item => item.status === 'sending').length
  const accepted = input.outbox.filter(item => item.status === 'sent').length
  const failed = input.outbox.filter(item => item.status === 'failed' || item.status === 'dead').length
  const processedEvents = input.providerEvents.filter(event => event.processingStatus === 'processed')
  const delivered = processedEvents.filter(event => event.eventType === 'delivered').length
  const bounced = processedEvents.filter(event => event.eventType === 'bounce').length
  const rejected = processedEvents.filter(event => event.eventType === 'reject').length
  const complaints = processedEvents.filter(event => event.eventType === 'complaint').length
  const unsubscribes = processedEvents.filter(event => event.eventType === 'unsubscribe').length

  return {
    queued,
    sending,
    accepted,
    failed,
    delivered,
    bounced,
    rejected,
    complaints,
    unsubscribes,
    marketingPaused: input.marketingPaused,
    deliveryRatePercent: accepted > 0 ? Math.round((delivered / accepted) * 10000) / 100 : null,
  }
}
