import assert from 'node:assert/strict'
import { evaluateManualPaymentTransition } from '../src/lib/manual-payment-status.ts'

const context = {
  submissionId: 'submission-1',
  actor: { id: 'actor-1', role: 'accounting' },
  occurredAt: '2026-09-06T18:00:00.000Z',
}

assert.deepEqual(evaluateManualPaymentTransition({ ...context, currentStatus: 'unpaid', nextStatus: 'paid' }), {
  decision: 'allow',
  status: 'paid',
  source: 'manual',
  audit: {
    actorId: 'actor-1',
    actorRole: 'accounting',
    submissionId: 'submission-1',
    from: 'unpaid',
    to: 'paid',
    source: 'manual',
    occurredAt: '2026-09-06T18:00:00.000Z',
  },
})

assert.deepEqual(evaluateManualPaymentTransition({ ...context, currentStatus: 'paid', nextStatus: 'refunded' }), {
  decision: 'allow',
  status: 'refunded',
  source: 'manual',
  audit: {
    actorId: 'actor-1',
    actorRole: 'accounting',
    submissionId: 'submission-1',
    from: 'paid',
    to: 'refunded',
    source: 'manual',
    occurredAt: '2026-09-06T18:00:00.000Z',
  },
})

assert.deepEqual(
  evaluateManualPaymentTransition({ ...context, actor: { id: 'actor-2', role: 'viewer' }, currentStatus: 'unpaid', nextStatus: 'paid' }),
  { decision: 'deny', reason: 'role_not_allowed' },
)

assert.deepEqual(
  evaluateManualPaymentTransition({ ...context, currentStatus: 'unpaid', nextStatus: 'refunded' }),
  { decision: 'deny', reason: 'transition_not_allowed' },
)

assert.deepEqual(
  evaluateManualPaymentTransition({ ...context, submissionId: '', currentStatus: 'unpaid', nextStatus: 'paid' }),
  { decision: 'deny', reason: 'input_invalid' },
)

console.log('manual-payment-status.test: PASS (V1-01)')
