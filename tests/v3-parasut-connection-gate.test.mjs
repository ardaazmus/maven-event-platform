import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  PARASUT_OAUTH_AUTHORIZE_URL,
  PARASUT_OAUTH_CALLBACK_PATH,
  PARASUT_OAUTH_TOKEN_URL,
  buildParasutAuthorizationUrl,
  buildParasutTokenExchangeRequest,
  consumeParasutOAuthState,
  createParasutOAuthState,
} from '../src/lib/parasut-oauth.ts'
import { evaluateParasutHealth } from '../src/lib/parasut-health.ts'

const status = readFileSync('STATUS.md', 'utf8')
const decision = readFileSync('docs/acceptance/v2-deferred-provider-decision.md', 'utf8')

assert(status.includes('V3-00'), 'status must route to the Paraşüt preparation gate')
assert(decision.includes('DEFERRED/OPTIONAL'), 'Paraşüt automatic invoicing must remain deferred')
assert.equal(PARASUT_OAUTH_AUTHORIZE_URL, 'https://api.parasut.com/oauth/authorize')
assert.equal(PARASUT_OAUTH_TOKEN_URL, 'https://api.parasut.com/oauth/token')

const redirectUri = `https://app.example.test${PARASUT_OAUTH_CALLBACK_PATH}`
const state = createParasutOAuthState({
  workspaceId: 'workspace-fixture',
  userId: 'user-fixture',
  redirectUri,
  expiresAt: new Date('2026-09-07T12:10:00.000Z'),
  state: 'opaque-state-fixture',
})
const consumed = consumeParasutOAuthState(
  {
    workspaceId: state.workspaceId,
    userId: state.userId,
    redirectUri: state.redirectUri,
    expiresAt: state.expiresAt,
    stateHash: state.stateHash,
    bindingHash: state.bindingHash,
    status: state.status,
    consumedAt: null,
  },
  'opaque-state-fixture',
  new Date('2026-09-07T12:01:00.000Z'),
)
assert.equal(consumed.status, 'consumed')
assert.throws(() =>
  consumeParasutOAuthState(
    {
      workspaceId: state.workspaceId,
      userId: state.userId,
      redirectUri: state.redirectUri,
      expiresAt: state.expiresAt,
      stateHash: state.stateHash,
      bindingHash: state.bindingHash,
      status: state.status,
      consumedAt: null,
    },
    'wrong-state',
    new Date('2026-09-07T12:01:00.000Z'),
  ),
  /invalid state/,
)

const authorizeUrl = buildParasutAuthorizationUrl({ clientId: 'client-fixture', state: 'opaque-state-fixture', redirectUri })
assert.equal(authorizeUrl.searchParams.get('client_secret'), null)
assert.equal(authorizeUrl.searchParams.get('state'), 'opaque-state-fixture')
const tokenExchange = buildParasutTokenExchangeRequest({
  code: 'authorization-code-fixture',
  clientId: 'client-fixture',
  clientSecret: 'client-secret-fixture',
  redirectUri,
})
assert.equal(tokenExchange.method, 'POST')
assert.equal(tokenExchange.body.get('grant_type'), 'authorization_code')
assert.equal(tokenExchange.body.get('client_secret'), 'client-secret-fixture')

assert.deepEqual(
  evaluateParasutHealth({
    workspaceId: 'workspace-fixture',
    connectionWorkspaceId: 'workspace-fixture',
    selectedCompanyId: 'company-fixture',
    provider: { ok: true, companyId: 'company-fixture', tokenValid: true },
  }),
  { status: 'active', canUse: true, companyId: 'company-fixture' },
)
assert.deepEqual(
  evaluateParasutHealth({
    workspaceId: 'workspace-fixture',
    connectionWorkspaceId: 'other-workspace',
    selectedCompanyId: 'company-fixture',
    provider: { ok: true, companyId: 'company-fixture', tokenValid: true },
  }),
  { status: 'scope_mismatch', canUse: false },
)
assert.deepEqual(
  evaluateParasutHealth({
    workspaceId: 'workspace-fixture',
    connectionWorkspaceId: 'workspace-fixture',
    selectedCompanyId: 'company-fixture',
    provider: { ok: false, kind: 'authentication', retryable: false },
  }),
  { status: 'health_check_failed', canUse: false },
)

console.log('v3-parasut-connection-gate.test: PASS (V3-00 preparation only)')
