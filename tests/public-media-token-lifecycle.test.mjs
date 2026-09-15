import assert from 'node:assert/strict'
import {
  createPublicMediaToken,
  getPublicMediaTokenAssetId,
  getPublicMediaTokenId,
  getPublicMediaTokenPayload,
  verifyPublicMediaToken,
} from '../src/lib/public-media-token.ts'

const nowMs = Date.parse('2026-09-11T07:00:00.000Z')
const token = createPublicMediaToken('asset-1', 'form-slug', { nowMs, ttlMs: 15 * 60 * 1000 })
const payload = getPublicMediaTokenPayload(token)

assert.equal(getPublicMediaTokenAssetId(token), 'asset-1')
assert.equal(payload?.scope, 'form-slug')
assert.equal(payload?.iat, Math.floor(nowMs / 1000))
assert.equal(payload?.exp, Math.floor((nowMs + 15 * 60 * 1000) / 1000))
assert.match(getPublicMediaTokenId(token) ?? '', /^[A-Za-z0-9_-]+$/)
assert.equal(verifyPublicMediaToken(token, 'form-slug', { nowMs }), 'asset-1')
assert.equal(verifyPublicMediaToken(token, 'other-form', { nowMs }), null, 'cross-scope token must fail closed')
assert.equal(verifyPublicMediaToken(token, 'form-slug', { nowMs: nowMs + 15 * 60 * 1000 }), null, 'expired token must fail closed')
assert.equal(verifyPublicMediaToken(token, 'form-slug', { nowMs, revokedTokenIds: [getPublicMediaTokenId(token)] }), null, 'revoked token must fail closed')
assert.equal(verifyPublicMediaToken(`${token}x`, 'form-slug', { nowMs }), null, 'tampered signature must fail closed')
assert.notEqual(createPublicMediaToken('asset-1', 'form-slug', { nowMs }), token, 'issued tokens must have unique IDs')

console.log('public-media-token-lifecycle.test: PASS (R10-V4-09)')
