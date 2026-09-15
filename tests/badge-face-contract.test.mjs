import assert from 'node:assert/strict'
import { buildBadgeFaceRenderPlan } from '../src/lib/badge-face-contract.ts'

const single = buildBadgeFaceRenderPlan({ mode: 'SINGLE_FACE', frontAssetId: 'front-v1' })
assert.deepEqual(single, {
  ok: true,
  mode: 'SINGLE_FACE',
  pageCount: 1,
  faces: ['front'],
  frontAssetId: 'front-v1',
})

const dual = buildBadgeFaceRenderPlan({ mode: 'DUAL_FACE', frontAssetId: 'front-v1', backAssetId: 'back-v1' })
assert.deepEqual(dual, {
  ok: true,
  mode: 'DUAL_FACE',
  pageCount: 2,
  faces: ['front', 'back'],
  frontAssetId: 'front-v1',
  backAssetId: 'back-v1',
})

assert.deepEqual(buildBadgeFaceRenderPlan({ mode: 'DUAL_FACE', frontAssetId: 'front-v1' }), { ok: false, code: 'BACK_ASSET_REQUIRED' })
assert.deepEqual(buildBadgeFaceRenderPlan({ mode: 'SINGLE_FACE', frontAssetId: 'front-v1', backAssetId: 'back-v1' }), { ok: false, code: 'BACK_NOT_ALLOWED' })
assert.deepEqual(buildBadgeFaceRenderPlan({ mode: 'SINGLE_FACE', frontAssetId: '   ' }), { ok: false, code: 'FRONT_REQUIRED' })
assert.deepEqual(buildBadgeFaceRenderPlan({ mode: 'DUAL_FACE', frontAssetId: 'front-v1', backAssetId: '  ' }), { ok: false, code: 'BACK_ASSET_REQUIRED' })

console.log('badge-face-contract: all assertions passed')
