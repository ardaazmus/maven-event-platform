import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { decryptParasutCredential, parasutCredentialEnv } from '../src/lib/parasut-credentials.ts'
import {
  buildParasutRefreshRequest,
  isParasutRefreshDue,
  prepareParasutCredentialRotation,
} from '../src/lib/parasut-token-rotation.ts'

const now = new Date('2026-09-05T12:00:00.000Z')
const env = {
  [parasutCredentialEnv.key]: Buffer.alloc(32, 8).toString('base64url'),
  [parasutCredentialEnv.keyId]: 'test-key',
}
const rotationSource = readFileSync('src/lib/parasut-token-rotation.ts', 'utf8')
assert.match(rotationSource, /updateMany/, 'rotation persistence must use an atomic conditional update')
assert.match(rotationSource, /credentialVersion:\s*input\.expectedVersion/, 'rotation must compare the expected credential version')
assert.match(rotationSource, /credentialVersion:\s*\{ increment: 1 \}/, 'successful rotation must advance credential version')

assert.equal(isParasutRefreshDue(new Date(now.getTime() + 4 * 60_000), now), true)
assert.equal(isParasutRefreshDue(new Date(now.getTime() + 6 * 60_000), now), false)

const request = buildParasutRefreshRequest({ clientId: 'client', clientSecret: 'secret', refreshToken: 'refresh' })
assert.equal(request.url, 'https://api.parasut.com/oauth/token')
assert.equal(request.body.get('grant_type'), 'refresh_token')
assert.equal(request.body.get('refresh_token'), 'refresh')
assert.equal(request.body.get('client_secret'), 'secret')
assert.equal(request.body.get('grant_type') === 'password', false)

let writes = 0
const stale = await prepareParasutCredentialRotation({
  expectedVersion: 2,
  currentVersion: 3,
  tokenSet: { accessToken: 'new-access', refreshToken: 'new-refresh', expiresInSeconds: 7200 },
  env,
  persist: async () => { writes += 1; return true },
})
assert.deepEqual(stale, { status: 'stale' })
assert.equal(writes, 0)

const rotated = await prepareParasutCredentialRotation({
  expectedVersion: 3,
  currentVersion: 3,
  tokenSet: { accessToken: 'new-access', refreshToken: 'new-refresh', expiresInSeconds: 7200 },
  env,
  persist: async (envelope, version) => {
    writes += 1
    assert.equal(version, 4)
    assert.deepEqual(JSON.parse(decryptParasutCredential(envelope, env)), {
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      accessTokenExpiresAt: '2026-09-05T14:00:00.000Z',
    })
    return true
  },
  now,
})
assert.deepEqual(rotated, { status: 'rotated', nextVersion: 4 })
assert.equal(writes, 1)

const lostRace = await prepareParasutCredentialRotation({
  expectedVersion: 3,
  currentVersion: 3,
  tokenSet: { accessToken: 'new-access', refreshToken: 'new-refresh', expiresInSeconds: 7200 },
  env,
  persist: async () => false,
  now,
})
assert.deepEqual(lostRace, { status: 'stale' })

console.log('parasut token rotation contract tests: PASS')
