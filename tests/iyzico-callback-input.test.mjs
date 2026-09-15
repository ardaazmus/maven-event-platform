import assert from 'node:assert'
import { parseIyzicoCallbackInput } from '../src/lib/iyzico-callback-input.ts'

assert.deepEqual(parseIyzicoCallbackInput({ token: 'token_123456', status: 'success' }), {
  ok: true,
  provider: 'iyzico',
  token: 'token_123456',
  nextState: 'processing',
})

assert.deepEqual(parseIyzicoCallbackInput({ token: 'token_123456', status: 'failure' }), {
  ok: true,
  provider: 'iyzico',
  token: 'token_123456',
  nextState: 'processing',
})

assert.deepEqual(parseIyzicoCallbackInput({ token: 'token_123456', status: 'success', receipt: 'pk_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' }), {
  ok: true,
  provider: 'iyzico',
  token: 'token_123456',
  publicKey: 'pk_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  nextState: 'processing',
})

assert.deepEqual(parseIyzicoCallbackInput({ token: 'token_123456', status: 'success', paymentOrderId: 'po_secret' }), { ok: false, reason: 'unknown_field' })
assert.deepEqual(parseIyzicoCallbackInput({ token: 'short' }), { ok: false, reason: 'token_invalid' })
assert.deepEqual(parseIyzicoCallbackInput({ status: 'success' }), { ok: false, reason: 'token_invalid' })
assert.deepEqual(parseIyzicoCallbackInput({ token: 'token_123456', receipt: 'po_internal' }), { ok: false, reason: 'public_key_invalid' })

console.log('iyzico-callback-input.test: PASS (PAY-06D-16)')
