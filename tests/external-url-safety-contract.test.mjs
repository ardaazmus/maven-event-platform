import assert from 'node:assert/strict'
import { evaluateCallbackState, validateAllowedRedirectUrl, validateExternalHttpsUrl } from '../src/lib/external-url-safety-contract.ts'

assert.deepEqual(validateExternalHttpsUrl('https://api.example.com/v1'), { allowed: true, normalizedUrl: 'https://api.example.com/v1' })
assert.equal(validateExternalHttpsUrl('http://localhost:3000/callback').allowed, false)
assert.deepEqual(validateExternalHttpsUrl('http://localhost:3000/callback', { allowLocalhostHttp: true }), { allowed: true, normalizedUrl: 'http://localhost:3000/callback' })
for (const url of ['https://127.0.0.1/hook', 'https://10.0.0.2/hook', 'https://192.168.1.4/hook', 'https://169.254.169.254/latest', 'https://[::1]/hook']) assert.equal(validateExternalHttpsUrl(url).allowed, false)
assert.equal(validateExternalHttpsUrl('https://user:pass@api.example.com/hook').allowed, false)
assert.equal(validateExternalHttpsUrl('https://api.example.com/hook#fragment').allowed, false)

const allowlist = { origin: 'https://app.example.com', path: '/oauth/callback' }
assert.deepEqual(validateAllowedRedirectUrl('https://app.example.com/oauth/callback?state=opaque-state', allowlist), { allowed: true, normalizedUrl: 'https://app.example.com/oauth/callback?state=opaque-state' })
assert.equal(validateAllowedRedirectUrl('https://evil.example/oauth/callback', allowlist).allowed, false)
assert.equal(validateAllowedRedirectUrl('https://app.example.com/other', allowlist).allowed, false)
assert.equal(validateAllowedRedirectUrl('https://app.example.com/oauth/callback#next', allowlist).allowed, false)

const validState = { receivedState: 'opaque-state', expectedState: 'opaque-state', consumed: false, expiresAtMs: 2_000, nowMs: 1_000, bindingMatches: true }
assert.deepEqual(evaluateCallbackState(validState), { allowed: true })
assert.equal(evaluateCallbackState({ ...validState, receivedState: undefined }).allowed, false)
assert.equal(evaluateCallbackState({ ...validState, receivedState: 'other-state' }).allowed, false)
assert.equal(evaluateCallbackState({ ...validState, consumed: true }).allowed, false)
assert.equal(evaluateCallbackState({ ...validState, expiresAtMs: 1_000 }).allowed, false)
assert.equal(evaluateCallbackState({ ...validState, bindingMatches: false }).allowed, false)

console.log('external-url-safety-contract.test: PASS (R10-V4-33)')
