import assert from 'node:assert/strict'
import {
  canTransitionMediaAssetState,
  MEDIA_ASSET_PURPOSES,
  MEDIA_ASSET_STATES,
} from '../src/lib/media.ts'

assert.deepEqual(MEDIA_ASSET_PURPOSES, [
  'form_media',
  'invoice_document',
  'badge_template',
  'certificate',
])
assert.deepEqual(MEDIA_ASSET_STATES, [
  'quarantine',
  'clean',
  'ready',
  'rejected',
  'archived',
])

for (const purpose of MEDIA_ASSET_PURPOSES) assert.equal(typeof purpose, 'string')
assert.equal(canTransitionMediaAssetState('quarantine', 'clean'), true)
assert.equal(canTransitionMediaAssetState('clean', 'ready'), true)
assert.equal(canTransitionMediaAssetState('ready', 'archived'), true)
assert.equal(canTransitionMediaAssetState('rejected', 'quarantine'), true)
assert.equal(canTransitionMediaAssetState('quarantine', 'ready'), false)
assert.equal(canTransitionMediaAssetState('archived', 'ready'), false)
assert.equal(canTransitionMediaAssetState('unknown', 'ready'), false)

console.log('media-asset-state.test: PASS (R10-V4-05)')
