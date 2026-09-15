import assert from 'node:assert'
import {
  SUBSCRIPTION_STATES,
  evaluateSubscriptionTransition,
} from '../src/lib/subscription-state.ts'

assert.deepEqual(SUBSCRIPTION_STATES, [
  'active',
  'due_soon',
  'grace',
  'suspended',
  'ended',
])

assert.deepEqual(evaluateSubscriptionTransition('active', 'due_soon'), {
  accepted: true,
  changed: true,
  from: 'active',
  to: 'due_soon',
})

assert.deepEqual(evaluateSubscriptionTransition('due_soon', 'active'), {
  accepted: true,
  changed: true,
  from: 'due_soon',
  to: 'active',
})

assert.deepEqual(evaluateSubscriptionTransition('grace', 'suspended'), {
  accepted: true,
  changed: true,
  from: 'grace',
  to: 'suspended',
})

assert.deepEqual(evaluateSubscriptionTransition('suspended', 'active'), {
  accepted: true,
  changed: true,
  from: 'suspended',
  to: 'active',
})

assert.deepEqual(evaluateSubscriptionTransition('active', 'active'), {
  accepted: true,
  changed: false,
  from: 'active',
  to: 'active',
})

assert.deepEqual(evaluateSubscriptionTransition('active', 'unknown'), {
  accepted: false,
  reason: 'invalid_target_state',
  from: 'active',
  to: 'unknown',
})

assert.deepEqual(evaluateSubscriptionTransition('ended', 'due_soon'), {
  accepted: false,
  reason: 'invalid_transition',
  from: 'ended',
  to: 'due_soon',
})

console.log('subscription-state.test: PASS (BILL-00)')
