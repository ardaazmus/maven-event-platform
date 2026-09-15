export const SUBSCRIPTION_STATES = [
  'active',
  'due_soon',
  'grace',
  'suspended',
  'ended',
] as const

export type SubscriptionState = (typeof SUBSCRIPTION_STATES)[number]

type TransitionResult =
  | {
      accepted: true
      changed: boolean
      from: SubscriptionState
      to: SubscriptionState
    }
  | {
      accepted: false
      reason: 'invalid_current_state' | 'invalid_target_state' | 'invalid_transition'
      from: string
      to: string
    }

const allowedTransitions: Record<SubscriptionState, readonly SubscriptionState[]> = {
  active: ['due_soon', 'grace', 'suspended', 'ended'],
  due_soon: ['active', 'grace', 'suspended', 'ended'],
  grace: ['active', 'suspended', 'ended'],
  suspended: ['active', 'ended'],
  ended: [],
}

function isSubscriptionState(value: string): value is SubscriptionState {
  return (SUBSCRIPTION_STATES as readonly string[]).includes(value)
}

export function evaluateSubscriptionTransition(from: string, to: string): TransitionResult {
  if (!isSubscriptionState(from)) {
    return { accepted: false, reason: 'invalid_current_state', from, to }
  }

  if (!isSubscriptionState(to)) {
    return { accepted: false, reason: 'invalid_target_state', from, to }
  }

  if (from === to) {
    return { accepted: true, changed: false, from, to }
  }

  if (!allowedTransitions[from].includes(to)) {
    return { accepted: false, reason: 'invalid_transition', from, to }
  }

  return { accepted: true, changed: true, from, to }
}

export type TenantSubscriptionDecision =
  | {
      allowed: true
      scope: 'tenant'
      subscriptionDomain: 'platform_subscription'
      subscriptionId: string
      from: SubscriptionState
      to: SubscriptionState
      effectiveAt: string
    }
  | {
      allowed: false
      reason:
        | 'invalid_request'
        | 'tenant_scope_mismatch'
        | 'operator_approval_required'
        | 'operator_role_required'
        | 'invalid_subscription_domain'
        | 'provider_mutation_forbidden'
        | 'invalid_transition'
        | 'effective_date_invalid'
    }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * Authorizes the first-version, manually controlled platform subscription
 * state change without collecting a tenant's end-customer payment.
 */
export function evaluateTenantSubscriptionChange(inputValue: unknown): TenantSubscriptionDecision {
  if (!isRecord(inputValue)) return { allowed: false, reason: 'invalid_request' }
  const input = inputValue
  if (typeof input.tenantId !== 'string' || typeof input.requestedTenantId !== 'string' || input.tenantId !== input.requestedTenantId) return { allowed: false, reason: 'tenant_scope_mismatch' }
  if (typeof input.subscriptionId !== 'string' || !input.subscriptionId) return { allowed: false, reason: 'invalid_request' }
  if (input.actorRole !== 'platform_operator') return { allowed: false, reason: 'operator_role_required' }
  if (input.subscriptionDomain !== 'platform_subscription') return { allowed: false, reason: 'invalid_subscription_domain' }
  if (input.providerMutation !== false) return { allowed: false, reason: 'provider_mutation_forbidden' }
  if (input.operatorApproved !== true || typeof input.approvalReference !== 'string' || !input.approvalReference.trim()) return { allowed: false, reason: 'operator_approval_required' }
  if (typeof input.currentState !== 'string' || typeof input.targetState !== 'string') return { allowed: false, reason: 'invalid_request' }
  const transition = evaluateSubscriptionTransition(input.currentState, input.targetState)
  if (!transition.accepted) return { allowed: false, reason: 'invalid_transition' }
  if (typeof input.effectiveAt !== 'string' || !Number.isFinite(Date.parse(input.effectiveAt))) return { allowed: false, reason: 'effective_date_invalid' }
  return {
    allowed: true,
    scope: 'tenant',
    subscriptionDomain: 'platform_subscription',
    subscriptionId: input.subscriptionId,
    from: transition.from,
    to: transition.to,
    effectiveAt: input.effectiveAt,
  }
}
