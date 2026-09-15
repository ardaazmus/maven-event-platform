export type EmailDeliveryStatus = 'delivered' | 'bounced' | 'rejected' | 'complained'

const statusByEventType: Record<string, EmailDeliveryStatus | null> = {
  delivered: 'delivered',
  bounce: 'bounced',
  reject: 'rejected',
  complaint: 'complained',
  unsubscribe: null,
}

const statusPriority: Record<EmailDeliveryStatus, number> = {
  delivered: 1,
  rejected: 2,
  bounced: 3,
  complained: 4,
}

function knownStatus(value: string | null | undefined): EmailDeliveryStatus | null {
  return value && value in statusPriority ? value as EmailDeliveryStatus : null
}

/** Returns the monotonic delivery evidence state for a verified provider event. */
export function nextEmailDeliveryStatus(current: string | null | undefined, eventType: string): EmailDeliveryStatus | null {
  const next = statusByEventType[eventType] ?? null
  if (!next) return null

  const currentStatus = knownStatus(current)
  if (!currentStatus || statusPriority[next] >= statusPriority[currentStatus]) return next
  return currentStatus
}
