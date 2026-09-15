import assert from 'node:assert/strict'
import { buildOAuthAuthorizationUrl, createOAuthPkceTransaction, generateOAuthCodeVerifier, verifyOAuthCallback } from '../src/lib/oauth-pkce-contract.ts'

const verifier = generateOAuthCodeVerifier()
const transactionResult = createOAuthPkceTransaction({
  transactionId: 'transaction-1',
  tenantId: 'tenant-1',
  workspaceId: 'workspace-1',
  actorId: 'actor-1',
  redirectUri: 'https://app.example.test/api/integrations/parasut/oauth/callback',
  state: 'state_value_123456789012345678901234567890',
  codeVerifier: verifier,
  nowMs: 10_000,
})
assert.equal(transactionResult.ok, true)

if (transactionResult.ok) {
  const transaction = transactionResult.transaction
  const authorizationUrl = buildOAuthAuthorizationUrl({ authorizationEndpoint: 'https://provider.example.test/oauth/authorize', clientId: 'client-1', transaction })
  assert.equal(authorizationUrl.searchParams.get('code_challenge_method'), 'S256')
  assert.equal(authorizationUrl.searchParams.get('code_challenge'), transaction.codeChallenge)
  assert.equal(authorizationUrl.searchParams.get('state'), 'state_value_123456789012345678901234567890')
  assert.notEqual(authorizationUrl.searchParams.get('state'), transaction.stateHash)
  assert.equal(authorizationUrl.searchParams.has('code_verifier'), false)
  assert.equal(authorizationUrl.searchParams.has('client_secret'), false)

  assert.deepEqual(
    verifyOAuthCallback({ transaction, state: 'state_value_123456789012345678901234567890', code: 'auth-code-1', nowMs: 11_000, tenantId: 'tenant-1', workspaceId: 'workspace-1', actorId: 'actor-1', redirectUri: transaction.redirectUri }),
    { ok: true, consumedAtMs: 11_000, code: 'auth-code-1' },
  )
  assert.deepEqual(
    verifyOAuthCallback({ transaction, state: 'state_value_123456789012345678901234567890', code: 'auth-code-1', nowMs: 11_000, tenantId: 'tenant-2', workspaceId: 'workspace-1', actorId: 'actor-1', redirectUri: transaction.redirectUri }),
    { ok: false, reason: 'tenant_mismatch' },
  )
  assert.deepEqual(
    verifyOAuthCallback({ transaction, state: 'state_value_123456789012345678901234567890', code: 'auth-code-1', nowMs: 11_000, tenantId: 'tenant-1', workspaceId: 'workspace-1', actorId: 'actor-1', redirectUri: 'https://app.example.test/api/integrations/parasut/oauth/callback?unsafe=1' }),
    { ok: false, reason: 'redirect_mismatch' },
  )
  assert.deepEqual(
    verifyOAuthCallback({ transaction: { ...transaction, consumedAtMs: 12_000 }, state: 'state_value_123456789012345678901234567890', code: 'auth-code-1', nowMs: 13_000, tenantId: 'tenant-1', workspaceId: 'workspace-1', actorId: 'actor-1', redirectUri: transaction.redirectUri }),
    { ok: false, reason: 'already_consumed' },
  )
  assert.deepEqual(
    verifyOAuthCallback({ transaction, state: 'state_value_123456789012345678901234567891', code: 'auth-code-1', nowMs: 11_000, tenantId: 'tenant-1', workspaceId: 'workspace-1', actorId: 'actor-1', redirectUri: transaction.redirectUri }),
    { ok: false, reason: 'state_mismatch' },
  )
}

assert.deepEqual(createOAuthPkceTransaction({ transactionId: 'transaction-1', tenantId: 'tenant-1', workspaceId: 'workspace-1', actorId: 'actor-1', redirectUri: 'http://app.example.test/api/integrations/parasut/oauth/callback', state: 'state_value_123456789012345678901234567890', codeVerifier: verifier, nowMs: 10_000 }), { ok: false, reason: 'redirect_invalid' })

console.log('oauth-pkce-contract.test: PASS (R10-V4-15)')
