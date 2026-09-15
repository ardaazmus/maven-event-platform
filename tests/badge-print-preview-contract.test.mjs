import assert from 'node:assert/strict'
import { buildBadgePrintPreviewPlan } from '../src/lib/badge-print-preview-contract.ts'

const printProfile = {
  id: 'event-stock-portrait',
  widthPt: 288,
  heightPt: 432,
  bleedPt: 9,
  safeArea: { xPt: 12, yPt: 12, widthPt: 264, heightPt: 408 },
  orientation: 'portrait',
}

const single = buildBadgePrintPreviewPlan({ mode: 'SINGLE_FACE', frontAssetId: 'front-v1', printProfile })
assert.equal(single.ok, true)
assert.deepEqual(single.plan?.pages, [{ face: 'front', order: 1, assetId: 'front-v1' }])
assert.equal(single.plan?.flipEdge, null)

const dual = buildBadgePrintPreviewPlan({ mode: 'DUAL_FACE', frontAssetId: 'front-v1', backAssetId: 'back-v1', printProfile, flipEdge: 'LONG_EDGE' })
assert.equal(dual.ok, true)
assert.deepEqual(dual.plan?.pages, [
  { face: 'front', order: 1, assetId: 'front-v1' },
  { face: 'back', order: 2, assetId: 'back-v1' },
])
assert.equal(dual.plan?.flipEdgeLabel, 'Uzun kenardan çevir')

assert.deepEqual(buildBadgePrintPreviewPlan({ mode: 'DUAL_FACE', frontAssetId: 'front-v1', backAssetId: 'back-v1', printProfile }), { ok: false, code: 'FLIP_EDGE_REQUIRED' })
assert.deepEqual(buildBadgePrintPreviewPlan({ mode: 'SINGLE_FACE', frontAssetId: 'front-v1', printProfile, flipEdge: 'SHORT_EDGE' }), { ok: false, code: 'FLIP_EDGE_NOT_ALLOWED' })
assert.deepEqual(buildBadgePrintPreviewPlan({ mode: 'SINGLE_FACE', frontAssetId: 'front-v1', printProfile: { ...printProfile, widthPt: 500, heightPt: 300, safeArea: { xPt: 12, yPt: 12, widthPt: 476, heightPt: 276 } } }), { ok: false, code: 'ORIENTATION_MISMATCH' })
assert.deepEqual(buildBadgePrintPreviewPlan({ mode: 'SINGLE_FACE', frontAssetId: 'front-v1', printProfile: { ...printProfile, safeArea: { xPt: 0, yPt: 0, widthPt: 500, heightPt: 100 } } }), { ok: false, code: 'SAFE_AREA_INVALID' })

console.log('badge-print-preview-contract: all assertions passed')
