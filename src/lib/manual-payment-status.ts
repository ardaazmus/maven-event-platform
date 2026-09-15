export type ManualPaymentStatus = 'unpaid' | 'paid' | 'review' | 'refunded'

export type ManualPaymentTransitionInput = {
  submissionId: string
  currentStatus: unknown
  nextStatus: unknown
  actor: { id: unknown; role: unknown }
  occurredAt: unknown
}

export type ManualPaymentTransitionResult =
  | {
      decision: 'allow'
      status: ManualPaymentStatus
      source: 'manual'
      audit: {
        actorId: string
        actorRole: string
        submissionId: string
        from: ManualPaymentStatus
        to: ManualPaymentStatus
        source: 'manual'
        occurredAt: string
      }
    }
  | { decision: 'deny'; reason: 'input_invalid' | 'role_not_allowed' | 'transition_not_allowed' }

const MANUAL_PAYMENT_ROLES = new Set(['owner', 'admin', 'accounting'])

const ALLOWED_TRANSITIONS: Record<ManualPaymentStatus, readonly ManualPaymentStatus[]> = {
  unpaid: ['paid', 'review'],
  paid: ['review', 'refunded'],
  review: ['unpaid', 'paid'],
  refunded: ['review'],
}

function isManualPaymentStatus(value: unknown): value is ManualPaymentStatus {
  return value === 'unpaid' || value === 'paid' || value === 'review' || value === 'refunded'
}

function isValidTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0) return false
  return Number.isFinite(Date.parse(value))
}

export function evaluateManualPaymentTransition(input: ManualPaymentTransitionInput): ManualPaymentTransitionResult {
  const { actor, currentStatus, nextStatus, occurredAt, submissionId } = input

  if (
    typeof submissionId !== 'string' ||
    submissionId.length === 0 ||
    !actor ||
    typeof actor.id !== 'string' ||
    actor.id.length === 0 ||
    typeof actor.role !== 'string' ||
    !isManualPaymentStatus(currentStatus) ||
    !isManualPaymentStatus(nextStatus) ||
    !isValidTimestamp(occurredAt)
  ) {
    return { decision: 'deny', reason: 'input_invalid' }
  }

  if (!MANUAL_PAYMENT_ROLES.has(actor.role)) return { decision: 'deny', reason: 'role_not_allowed' }
  if (!ALLOWED_TRANSITIONS[currentStatus].includes(nextStatus)) return { decision: 'deny', reason: 'transition_not_allowed' }

  return {
    decision: 'allow',
    status: nextStatus,
    source: 'manual',
    audit: {
      actorId: actor.id,
      actorRole: actor.role,
      submissionId,
      from: currentStatus,
      to: nextStatus,
      source: 'manual',
      occurredAt,
    },
  }
}
