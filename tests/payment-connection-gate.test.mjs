import assert from 'node:assert'
import { evaluatePaymentConnectionGate } from '../src/lib/payment-connection-gate.ts'

const base = {
  workspaceId: 'ws_123',
  payment: { provider: 'iyzico' },
  config: { connectionId: 'pc_123', provider: 'iyzico', mode: 'test' },
  connection: { id: 'pc_123', workspaceId: 'ws_123', provider: 'iyzico', mode: 'test', status: 'active' },
}

assert.deepEqual(evaluatePaymentConnectionGate(base), { ok: true })
assert.deepEqual(evaluatePaymentConnectionGate({ ...base, connection: { ...base.connection, status: 'pending_verification' } }), { ok: false, reason: 'connection_not_active' })
assert.deepEqual(evaluatePaymentConnectionGate({ ...base, connection: { ...base.connection, workspaceId: 'ws_other' } }), { ok: false, reason: 'workspace_mismatch' })
assert.deepEqual(evaluatePaymentConnectionGate({ ...base, payment: { provider: 'stripe' } }), { ok: false, reason: 'published_provider_mismatch' })

console.log('payment-connection-gate.test: PASS (PAY-06D-08)')
