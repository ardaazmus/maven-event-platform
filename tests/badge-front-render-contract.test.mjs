import assert from 'node:assert/strict'
import { validateBadgeFrontRender } from '../src/lib/badge-front-render-contract.ts'

const base = {
  pageWidthPt: 288,
  pageHeightPt: 432,
  safeArea: { xPt: 12, yPt: 12, widthPt: 264, heightPt: 408 },
  backgroundAssetId: 'template-front-v1',
  textPlacements: [
    { key: 'firstName', box: { xPt: 24, yPt: 220, widthPt: 240, heightPt: 30 }, maxChars: 40, maxLines: 1 },
    { key: 'title', box: { xPt: 24, yPt: 252, widthPt: 240, heightPt: 30 }, maxChars: 80, maxLines: 2 },
  ],
  qrPlacement: {
    box: { xPt: 204, yPt: 336, widthPt: 48, heightPt: 48 },
    vector: true,
    quietZoneModules: 4,
  },
  values: { firstName: 'Ada', title: 'Konuşmacı' },
}

const valid = validateBadgeFrontRender(base)
assert.equal(valid.ok, true)
assert.deepEqual(valid.plan?.faces, ['front'])
assert.equal(valid.plan?.pageCount, 1)

assert.deepEqual(validateBadgeFrontRender({ ...base, backPage: {} }), { ok: false, code: 'BACK_PAGE_NOT_ALLOWED' })
assert.deepEqual(validateBadgeFrontRender({ ...base, qrPlacement: { ...base.qrPlacement, vector: false } }), { ok: false, code: 'QR_NOT_VECTOR' })
assert.deepEqual(validateBadgeFrontRender({ ...base, qrPlacement: { ...base.qrPlacement, quietZoneModules: 3 } }), { ok: false, code: 'QR_INVALID' })
assert.deepEqual(validateBadgeFrontRender({ ...base, textPlacements: [{ ...base.textPlacements[0], box: { xPt: 0, yPt: 220, widthPt: 240, heightPt: 30 } }] }), { ok: false, code: 'BOX_OUTSIDE_SAFE_AREA', field: 'firstName' })
assert.deepEqual(validateBadgeFrontRender({ ...base, values: { firstName: 'x'.repeat(41) } }), { ok: false, code: 'TEXT_OVERFLOW', field: 'firstName' })
assert.deepEqual(validateBadgeFrontRender({ ...base, values: { firstName: 'Ada\nLovelace\nExtra' } }), { ok: false, code: 'TEXT_OVERFLOW', field: 'firstName' })

console.log('badge-front-render-contract: all assertions passed')
