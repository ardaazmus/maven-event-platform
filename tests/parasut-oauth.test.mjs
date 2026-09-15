import assert from 'node:assert/strict'
import { createHash, randomBytes } from 'node:crypto'
import {
  buildParasutAuthorizationUrl,
  buildParasutTokenExchangeRequest,
  consumeParasutOAuthState,
  createParasutOAuthState,
  parseParasutTokenResponse,
  rejectParasutGrant,
} from '../src/lib/parasut-oauth.ts'
import { decryptParasutCredential, encryptParasutCredential, parasutCredentialEnv } from '../src/lib/parasut-credentials.ts'

const now = new Date('2026-09-05T12:00:00.000Z')
const input = {
  workspaceId: 'ws_1',
  userId: 'user_1',
  redirectUri: 'https://app.example.com/api/integrations/parasut/oauth/callback',
  expiresAt: new Date(now.getTime() + 10 * 60_000),
  state: 'state-test-value',
}

const state = createParasutOAuthState(input)
assert.equal(state.stateHash, createHash('sha256').update(input.state).digest('hex'))
assert.equal(state.status, 'pending')
assert.equal(state.workspaceId, input.workspaceId)
assert.equal(state.userId, input.userId)
assert.equal(state.redirectUri, input.redirectUri)

assert.deepEqual(consumeParasutOAuthState({ ...state }, input.state, now), {
  status: 'consumed',
  consumedAt: now,
})
assert.throws(() => consumeParasutOAuthState({ ...state, status: 'consumed' }, input.state, now), /already consumed/)
assert.throws(() => consumeParasutOAuthState({ ...state }, 'wrong-state', now), /invalid state/)
assert.throws(() => consumeParasutOAuthState({ ...state, expiresAt: new Date(now.getTime() - 1) }, input.state, now), /expired/)
assert.throws(() => consumeParasutOAuthState({ ...state, workspaceId: 'other-workspace' }, input.state, now), /workspace binding/)

const authorizationUrl = buildParasutAuthorizationUrl({
  clientId: 'client-id',
  state: input.state,
  redirectUri: input.redirectUri,
})
assert.equal(authorizationUrl.origin, 'https://api.parasut.com')
assert.equal(authorizationUrl.pathname, '/oauth/authorize')
assert.equal(authorizationUrl.searchParams.get('response_type'), 'code')
assert.equal(authorizationUrl.searchParams.get('state'), input.state)
assert.equal(authorizationUrl.searchParams.get('redirect_uri'), input.redirectUri)
assert.equal(authorizationUrl.searchParams.has('client_secret'), false)

const exchange = buildParasutTokenExchangeRequest({
  code: 'authorization-code',
  clientId: 'client-id',
  clientSecret: 'server-secret',
  redirectUri: input.redirectUri,
})
assert.equal(exchange.url, 'https://api.parasut.com/oauth/token')
assert.equal(exchange.body.get('grant_type'), 'authorization_code')
assert.equal(exchange.body.get('code'), 'authorization-code')
assert.equal(exchange.body.get('client_secret'), 'server-secret')
assert.equal(exchange.headers.authorization, undefined)
assert.throws(() => buildParasutTokenExchangeRequest({ ...exchange, grantType: 'password' }), /password grant is rejected/)
assert.throws(() => rejectParasutGrant('password'), /password grant is rejected/)

assert.deepEqual(parseParasutTokenResponse({ access_token: 'access', refresh_token: 'refresh', expires_in: 7200 }), {
  accessToken: 'access',
  refreshToken: 'refresh',
  expiresInSeconds: 7200,
})
assert.throws(() => parseParasutTokenResponse({ access_token: 'access' }), /refresh_token/)
const credentialEnv = {
  [parasutCredentialEnv.key]: Buffer.alloc(32, 7).toString('base64url'),
  [parasutCredentialEnv.keyId]: 'test-key',
}
const envelope = encryptParasutCredential(JSON.stringify({ accessToken: 'access', refreshToken: 'refresh' }), credentialEnv)
assert.equal(decryptParasutCredential(envelope, credentialEnv), JSON.stringify({ accessToken: 'access', refreshToken: 'refresh' }))
assert.equal(envelope.includes('access'), false)
assert.throws(() => decryptParasutCredential(envelope, { ...credentialEnv, [parasutCredentialEnv.keyId]: 'old-key' }), /not active/)
assert.equal(randomBytes(4).length, 4)

console.log('parasut oauth contract tests: PASS')
