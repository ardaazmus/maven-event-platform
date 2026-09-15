import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runFakeProvider } from '../src/lib/fake-provider-adapter.ts'

const base = { provider: 'iyzico', requestId: 'request-1' }

assert.deepEqual(runFakeProvider({ ...base, scenario: 'success' }), {
  ok: true,
  provider: 'iyzico',
  requestId: 'request-1',
  scenario: 'success',
  status: 'accepted',
  providerReference: 'fake-iyzico-request-1',
  retryable: false,
})
assert.deepEqual(runFakeProvider({ ...base, scenario: 'timeout' }), {
  ok: false,
  provider: 'iyzico',
  requestId: 'request-1',
  scenario: 'timeout',
  category: 'unavailable',
  providerStatus: null,
  retryable: true,
})
assert.deepEqual(runFakeProvider({ ...base, scenario: 'rate_limited' }), {
  ok: false,
  provider: 'iyzico',
  requestId: 'request-1',
  scenario: 'rate_limited',
  category: 'rate_limited',
  providerStatus: 429,
  retryable: true,
})
assert.deepEqual(runFakeProvider({ ...base, scenario: 'server_error' }), {
  ok: false,
  provider: 'iyzico',
  requestId: 'request-1',
  scenario: 'server_error',
  category: 'unavailable',
  providerStatus: 503,
  retryable: true,
})
assert.deepEqual(runFakeProvider({ ...base, scenario: 'unknown' }), { ok: false, reason: 'scenario_invalid' })
assert.deepEqual(runFakeProvider({ ...base, requestId: '../unsafe', scenario: 'success' }), { ok: false, reason: 'input_invalid' })
assert.deepEqual(runFakeProvider({ ...base, apiKey: 'never-accepted', scenario: 'success' }), { ok: false, reason: 'secret_forbidden' })
assert.deepEqual(runFakeProvider({ ...base, payload: { raw: 'never-accepted' }, scenario: 'success' }), { ok: false, reason: 'secret_forbidden' })

const source = readFileSync(new URL('../src/lib/fake-provider-adapter.ts', import.meta.url), 'utf8')
assert.equal(source.includes('fetch('), false)
assert.equal(source.includes('credentials'), false)
assert.equal('rawResponse' in runFakeProvider({ ...base, scenario: 'success' }), false)

console.log('fake-provider-adapter.test: PASS (R10-V4-17)')
