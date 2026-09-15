import assert from 'node:assert/strict'
import { authorizePaymentRetrieveWorkerRequest } from '../src/lib/payment-retrieve-worker-gate.ts'

assert.deepEqual(authorizePaymentRetrieveWorkerRequest({
  expectedSecret: 'worker-secret',
  providedSecret: 'worker-secret',
  limit: null,
}), { ok: true, limit: 10 })

assert.deepEqual(authorizePaymentRetrieveWorkerRequest({
  expectedSecret: 'worker-secret',
  providedSecret: 'wrong-secret',
  limit: '10',
}), { ok: false, status: 401, reason: 'unauthorized' })

assert.deepEqual(authorizePaymentRetrieveWorkerRequest({
  expectedSecret: undefined,
  providedSecret: 'worker-secret',
  limit: '10',
}), { ok: false, status: 503, reason: 'worker_unavailable' })

assert.deepEqual(authorizePaymentRetrieveWorkerRequest({
  expectedSecret: 'worker-secret',
  providedSecret: 'worker-secret',
  limit: '51',
}), { ok: false, status: 400, reason: 'invalid_limit' })

console.log('payment-retrieve-worker-gate.test: PASS (PAY-06D-40)')
